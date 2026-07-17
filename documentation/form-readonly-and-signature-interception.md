# Customization Guide: Form Field Read-Only Control & Signature Interception

This guide describes how to extend a fork of the Nutrient React Native SDK (`@nutrient-sdk/react-native`) with three native form capabilities:

1. **`setFormFieldReadOnly(fullyQualifiedName, readOnly, persist?)`** — lock or unlock a single form field at runtime.
2. **`interceptSignatureFields` + `onSignatureFieldTapped`** — intercept taps on signature form fields and suppress the native signature UI, so the application can run its own signing workflow.
3. **`dismissSignaturePad()`** — programmatically dismiss the native signature creation UI.

The implementation supports **both React Native architectures** (Legacy/Paper and New Architecture with Fabric + TurboModules), following the repository's [BRIDGING.md](../BRIDGING.md) recipe. It was implemented and verified against:

| Component | Version |
|---|---|
| Nutrient React Native SDK | 4.4.0 |
| Nutrient Android SDK | 11.5.1 |
| Nutrient iOS SDK (PSPDFKit) | 26.10.0 |
| React Native | 0.83.x |

All changes live on the `feature/form-readonly-signature-interception` branch. Runtime behavior was verified on an Android emulator and iOS simulator (New Architecture) with automated UI tests; see [Verification](#verification).

---

## Public API

```tsx
import NutrientView from '@nutrient-sdk/react-native';

const pdfRef = useRef<NutrientView>(null);

<NutrientView
  ref={pdfRef}
  document={documentPath}
  interceptSignatureFields={true}
  onSignatureFieldTapped={({ fullyQualifiedName, pageIndex }) => {
    // Native signature UI is suppressed. Start your custom signing flow here.
  }}
/>;

// Lock a single field (persisted into the PDF form field flags on iOS,
// widget annotation flags on Android — survives saving the document):
await pdfRef.current?.setFormFieldReadOnly('Applicant.Contact.Email', true, true);

// iOS only: disable interaction for the current viewer session without
// modifying the saved PDF:
await pdfRef.current?.setFormFieldReadOnly('Applicant.Contact.Email', true, false);

// Re-enable:
await pdfRef.current?.setFormFieldReadOnly('Applicant.Contact.Email', false);

// Dismiss the native signature UI if presented. Resolves `true` when a
// signature UI was dismissed, `false` when none was open (safe to call
// repeatedly):
const dismissed = await pdfRef.current?.dismissSignaturePad();
```

### Semantics and platform differences

| Aspect | iOS | Android |
|---|---|---|
| `persist: true` | Sets `PSPDFFormField.isReadOnly` (PDF form field flag; persists once the document is saved) | Adds `AnnotationFlags.LOCKEDCONTENTS` to every widget annotation of the field, preserving existing flags (persists once saved) |
| `persist: false` | Sets `PSPDFFormField.isEditable = false` (session-only; not written to the PDF) | Not supported — behaves like `persist: true` |
| Missing field | Promise rejects (`field_not_found` on Paper, `OPERATION_FAILED` on New Architecture) | Promise resolves `false` (legacy) / rejects (New Architecture) |
| `dismissSignaturePad()` targeting | Type-checks the presented controller (including a wrapping navigation stack) against `PSPDFSignatureCreationViewController` (Electronic Signatures), legacy `PSPDFSignatureViewController`, and the saved-signature `PSPDFSignatureSelectorViewController`; never dismisses unrelated modals | Scans candidate fragment managers for `ElectronicSignatureFragment` (creation UI) *and* `SignaturePickerFragment` (saved-signature picker / legacy flow) instances and dismisses via the matching static helper; never dismisses unrelated dialogs |
| Signature tap interception | `PSPDFViewControllerDelegate didTapOnAnnotation:` — consumes taps on `PSPDFSignatureFormElement` | `FormManager.OnFormElementClickedListener` — consumes clicks on `FormType.SIGNATURE` elements |

**Why `LOCKEDCONTENTS` on Android:** the Android SDK's `FormField` exposes `isReadOnly()` as a getter only, and `AnnotationFlags.READONLY` is documented as ignored for widget annotations. Updating the widget's `LOCKEDCONTENTS` flag is the supported way to make an existing widget non-editable. Always copy the existing flag set and add/remove only `LOCKEDCONTENTS`.

### Important caveats

- **Forms must be interactive.** On Android, a document opened straight from `file:///android_asset/...` is read-only: form fields render without highlights, taps degrade to page taps, and `onSignatureFieldTapped` never fires. Copy the document to a writable location first (see `extractFromAssetsIfMissing` in the Catalog's `ProgrammaticFormFilling` example).
- **Saving is the caller's responsibility.** `setFormFieldReadOnly(..., persist: true)` mutates the in-memory document only. Call `saveCurrentDocument()` afterwards to persist.
- **Not a security boundary.** A PDF read-only flag is a UI/document constraint. Server-side validation must still verify which fields the user may change and whether a signature is authorized.
- **Toolbar-initiated signatures are out of scope.** Interception covers signature *form field* taps. A signature started from the annotation toolbar is not intercepted; remove or replace the toolbar item if that flow must also be suppressed.
- **The signature UI is modal.** While it is presented, React Native UI cannot be tapped. To exercise `dismissSignaturePad()` while the UI is open, call it from a timer/event rather than a button press.
- **The signature UI is not always the creation pad.** Once a signature has been saved to the signature store (or under the legacy signature flow), tapping a signature field presents the saved-signature *picker* instead of the creation UI — `dismissSignaturePad()` recognizes both (see the targeting row above). And once a field is *signed*, tapping it selects the signature annotation (context menu) rather than opening any signature UI, so `dismissSignaturePad()` correctly resolves `false` in that state.

---

## Implementation walkthrough

Every layer below is required. Skipping the New Architecture layer produces a bridge that silently does nothing on Fabric builds, and vice versa.

### 1. TypeScript codegen specs (New Architecture)

**`src/specs/NativeNutrientViewTurboModule.ts`** — add the imperative methods to the `Spec` interface. All view-backed TurboModule methods take the view `reference` (the component's `nativeID`) as their first argument:

```ts
// Forms
setFormFieldReadOnly: (reference: string, fullyQualifiedName: string, readOnly: boolean, persist: boolean) => Promise<boolean>;

// Electronic Signatures
dismissSignaturePad: (reference: string) => Promise<boolean>;
```

**`src/specs/NutrientViewNativeComponent.ts`** — add the prop and the event to `NativeProps`:

```ts
interceptSignatureFields?: WithDefault<boolean, false>;

onSignatureFieldTapped?: BubblingEventHandler<{
  fullyQualifiedName: string;
  pageIndex: Int32;
}>;
```

Codegen (run automatically during app builds) generates from these: the Android `NutrientViewManagerInterface.setInterceptSignatureFields`, the `NativeNutrientViewTurboModuleSpec` base class, and the iOS C++ `NutrientViewEventEmitter::OnSignatureFieldTapped` emitter — everything the native layers below implement against.

### 2. Fabric wrapper — `src/NutrientViewFabric.tsx`

- Add both methods to the `NutrientViewFabricRef` interface and to the `useImperativeHandle` block, delegating to `NativeNutrientViewTurboModule` with `instanceId.toString()` as the reference.
- Pass `interceptSignatureFields: (props as any).interceptSignatureFields === true` (an explicit boolean so native always receives a defined value).
- Re-shape the event payload for the public callback:

```ts
onSignatureFieldTapped: (props as any).onSignatureFieldTapped
  ? (e: any) => {
      const native = e?.nativeEvent ?? e;
      (props as any).onSignatureFieldTapped({
        fullyQualifiedName: native?.fullyQualifiedName,
        pageIndex: native?.pageIndex,
      });
    }
  : undefined,
```

### 3. Public API — `index.js`

Each method branches on `isNewArchitectureEnabled()` first (Fabric ref), then falls back to the Legacy paths (Android view-manager command with a `requestId` promise, iOS `NativeModules.PSPDFKitViewManager`). See `setFormFieldReadOnly` and `dismissSignaturePad` in `index.js` for the exact pattern — it mirrors `setFormFieldValue`.

Also add:
- `_onSignatureFieldTapped` handler (unwraps `event.nativeEvent`),
- `onSignatureFieldTapped={this._onSignatureFieldTapped}` in **both** the Android and iOS render branches,
- `interceptSignatureFields: PropTypes.bool` and `onSignatureFieldTapped: PropTypes.func` with JSDoc (the JSDoc generates `types/index.d.ts` — run `npm run build-and-generate-types`).

### 4. iOS — Legacy (Paper)

**`ios/RCTPSPDFKitView.h`**
- Properties: `@property (nonatomic) BOOL interceptSignatureFields;` and `@property (nonatomic, copy) RCTBubblingEventBlock onSignatureFieldTapped;`
- Methods: `- (BOOL)setFormFieldReadOnly:readOnly:persist:` and `- (BOOL)dismissSignaturePad;`
- Delegate protocol addition (Fabric event path): `- (void)pspdfView:didTapSignatureFieldWithFullyQualifiedName:pageIndex:`

**`ios/RCTPSPDFKitView.m`**
- In the existing `pdfViewController:didTapOnAnnotation:...` delegate method, before the action-handler logic, intercept signature form elements. Both emission paths must be handled — the Fabric delegate takes precedence, the Paper bubbling block is the fallback — and the method returns `YES` to suppress the SDK's default signature UI:

```objc
if (self.interceptSignatureFields && [annotation isKindOfClass:PSPDFSignatureFormElement.class]) {
    PSPDFSignatureFormElement *signatureElement = (PSPDFSignatureFormElement *)annotation;
    NSString *fullyQualifiedName = signatureElement.fullyQualifiedFieldName ?: @"";
    NSInteger signaturePageIndex = (NSInteger)signatureElement.pageIndex;
    if ([self.delegate respondsToSelector:@selector(pspdfView:didTapSignatureFieldWithFullyQualifiedName:pageIndex:)]) {
        [(id<RCTPSPDFKitViewDelegate>)self.delegate pspdfView:self didTapSignatureFieldWithFullyQualifiedName:fullyQualifiedName pageIndex:signaturePageIndex];
    } else if (self.onSignatureFieldTapped) {
        self.onSignatureFieldTapped(@{ @"fullyQualifiedName": fullyQualifiedName, @"pageIndex": @(signaturePageIndex) });
    }
    return YES;
}
```

- `setFormFieldReadOnly` resolves the field via `[document.formParser findFieldWithFullFieldName:]`, then sets `formField.isReadOnly = readOnly` (persist) or `formField.isEditable = !readOnly` (transient), and calls `[self.pdfController reloadData]`. Guard with the `VALIDATE_DOCUMENT` macro like the neighboring form methods.
- `dismissSignaturePad` inspects `self.pdfController.presentedViewController` (unwrapping a `UINavigationController` to its `visibleViewController`), type-checks against `NSClassFromString(@"PSPDFSignatureCreationViewController")` and `NSClassFromString(@"PSPDFSignatureViewController")`, and only then dismisses. `NSClassFromString` avoids a compile-time dependency on the Swift-defined Electronic Signatures controller.

**`ios/RCTPSPDFKitViewManager.m`**
- `RCT_EXPORT_VIEW_PROPERTY(interceptSignatureFields, BOOL)` and `RCT_EXPORT_VIEW_PROPERTY(onSignatureFieldTapped, RCTBubblingEventBlock)`
- Two `RCT_EXPORT_METHOD`s following the `setFormFieldValue` pattern: resolve the view via `[self.bridge.uiManager viewForReactTag:reactTag]` on the main queue, call the view method, resolve/reject. Error codes used: `viewer_unavailable`, `field_not_found`.

### 5. iOS — New Architecture

**`ios/Turbo/NutrientViewTurboModule.mm`** — implement both spec methods; resolve the view with `[[NutrientViewRegistry shared] viewForId:reference]` on the main queue and call the same `RCTPSPDFKitView` methods.

**`ios/Fabric/NutrientView.mm`**
- In `updateProps:`, forward the prop: `_view.interceptSignatureFields = newProps->interceptSignatureFields;`
- Implement the new delegate callback, firing the codegen emitter:

```objc
- (void)pspdfView:(RCTPSPDFKitView *)view didTapSignatureFieldWithFullyQualifiedName:(NSString *)fullyQualifiedName pageIndex:(NSInteger)pageIndex {
  if (!_eventEmitter) { return; }
  facebook::react::NutrientViewEventEmitter::OnSignatureFieldTapped payload{
    fullyQualifiedName ? std::string([fullyQualifiedName UTF8String]) : std::string(""),
    (int)pageIndex
  };
  _eventEmitter->onSignatureFieldTapped(payload);
}
```

### 6. Android — shared `PdfView` (both architectures)

**`android/src/main/java/com/pspdfkit/views/PdfView.java`**
- Field + accessors: `private boolean interceptSignatureFields = false;` with `setInterceptSignatureFields` / `isInterceptSignatureFields`.
- Extend the `PdfViewDelegate` interface with `void onSignatureFieldTapped(String fullyQualifiedName, int pageIndex);` (every Fabric manager implementing the interface must add an override — see step 8).
- In `preparePdfFragment`, register the click listener alongside the existing form listeners: `pdfFragment.addOnFormElementClickedListener(pdfViewDocumentListener);`
- `setFormFieldReadOnly(String, boolean)` returns `Single<Boolean>`: iterate `document.getFormProvider().getFormElements()`, match `getFullyQualifiedName()`, copy each widget's `EnumSet<AnnotationFlags>` and add/remove `LOCKEDCONTENTS`. Return whether any widget matched; throw when no document is loaded.
- `dismissSignaturePad()` collects candidate `FragmentManager`s (the injected activity manager, the `PdfUiFragment`'s child manager, and — only when `isAdded()` — the `PdfFragment`'s parent and child managers), and for each that hosts a fragment tagged `ElectronicSignatureFragment.FRAGMENT_TAG`, calls `ElectronicSignatureFragment.dismiss(manager)`. Returns whether anything was dismissed. The `isAdded()` guards matter: `getParentFragmentManager()` throws on detached fragments, which would turn a benign "nothing open" call into a rejection.

**`android/src/main/java/com/pspdfkit/views/PdfViewDocumentListener.java`**
- Add `FormManager.OnFormElementClickedListener` to the implemented interfaces (its default `isFormElementClickable` returns `true`, so registration alone does not change behavior).
- Implement the click handler with the dual Fabric/Paper emission path used by every other callback in this class:

```java
@Override
public boolean onFormElementClicked(@NonNull FormElement formElement) {
    if (!parent.isInterceptSignatureFields() || formElement.getType() != FormType.SIGNATURE) {
        return false; // Not intercepted: Nutrient performs its default handling.
    }
    String fullyQualifiedName = formElement.getFullyQualifiedName();
    int pageIndex = formElement.getAnnotation().getPageIndex();
    if (isFabricMode && fabricDelegate != null) {
        fabricDelegate.onSignatureFieldTapped(fullyQualifiedName, pageIndex);
    } else {
        dispatchEvent(new PdfViewSignatureFieldTappedEvent(parent.getId(), fullyQualifiedName, pageIndex));
    }
    return true; // Consume the click; the native signature UI is not presented.
}
```

### 7. Android — Legacy (Paper)

- **`android/src/main/java/com/pspdfkit/react/events/PdfViewSignatureFieldTappedEvent.java`** (new): an `Event` subclass with `EVENT_NAME = "pdfViewSignatureFieldTapped"` and a `{fullyQualifiedName, pageIndex}` payload.
- **`PdfView.createDefaultEventRegistrationMap()`**: register it under registration name `onSignatureFieldTapped`.
- **`android/src/main/java/com/pspdfkit/react/ReactPdfViewManager.java`**:
  - `COMMAND_SET_FORM_FIELD_READ_ONLY = 17` and `COMMAND_DISMISS_SIGNATURE_PAD = 18`, registered in `getCommandsMap()`.
  - `receiveCommand` cases following the `setFormFieldValue` pattern: `requestId = args.getInt(0)`, results dispatched back through `PdfViewDataReturnedEvent`, disposables added to `annotationDisposables`.
  - `@ReactProp(name = "interceptSignatureFields")` setter delegating to the view.

### 8. Android — New Architecture

- **`android/src/newarch/java/io/nutrient/react/events/FabricOnSignatureFieldTappedEvent.kt`** (new): `EVENT_NAME = "topSignatureFieldTapped"` (Codegen's top-level name for a `BubblingEventHandler` named `onSignatureFieldTapped`).
- **`android/src/newarch/java/io/nutrient/react/fabric/ReactPdfViewManagerFabric.kt`**:
  - `override fun onSignatureFieldTapped(...)` in the anonymous `PdfViewDelegate`, dispatching the Fabric event.
  - `override fun setInterceptSignatureFields(view: PdfView, value: Boolean)` (the codegen interface gains this from the spec change).
  - `map["onSignatureFieldTapped"] = mapOf("registrationName" to "onSignatureFieldTapped")` in `getExportedCustomBubblingEventTypeConstants()`.
- **`ReactInstantPdfViewManagerFabric.kt`**: add a no-op `onSignatureFieldTapped` override (the Instant view does not support interception).
- **`android/src/newarch/java/io/nutrient/react/turbo/NutrientViewTurboModule.java`**: implement both spec methods; resolve the view via `NutrientViewRegistry`, subscribe to the `Single` on `Schedulers.io()` / observe on the main thread for `setFormFieldReadOnly`, and `view.post(...)` for `dismissSignaturePad` (fragment operations need the main thread).

### 9. Regenerate types

```bash
npm run build-and-generate-types
```

This rebuilds `lib/` from `src/` and regenerates `types/index.d.ts` from the JSDoc in `index.js`.

---

## Building and testing your fork

Follow [BRIDGING.md](../BRIDGING.md) for the full build-validation loop. Summary:

```bash
# Catalog app deps. NOTE: use --ignore-scripts with npm — the Catalog's
# postinstall script deletes node_modules through the file:../.. symlink
# that npm creates (the repo's scripts assume yarn).
cd samples/Catalog && npm install --legacy-peer-deps --ignore-scripts

# Android (compiles main + newarch source sets and runs codegen):
cd android && ./gradlew assembleDebug
# For an emulator on Apple Silicon: ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a

# iOS:
cd ../ios && pod install
xcodebuild -workspace Catalog.xcworkspace -scheme Catalog -configuration Debug -sdk iphonesimulator build
```

The Catalog contains a **Signature Interception** example (`samples/Catalog/examples/SignatureInterception.tsx`) exercising all three APIs — use it as a manual test harness. Remember the writable-document caveat above when testing with your own PDFs.

## Verification

The following was verified live (Android emulator + iOS simulator, New Architecture, Maestro-driven):

- Interception ON: tapping the signature field emits `{fullyQualifiedName: 'EMPLOYEE SIGNATURE', pageIndex: 0}` and the native signature UI does not open.
- Interception OFF: the default native "Add Signature" UI opens unchanged.
- `dismissSignaturePad()` resolves `true` and closes the UI when open; resolves `false` when nothing is presented; safe to call repeatedly across multiple open/close cycles.
- With a saved signature in the store, tapping the field opens the saved-signature picker ("Signatures" list on Android) — `dismissSignaturePad()` dismisses it too (`true`).
- `setFormFieldReadOnly('Name_Last', true)` blocks the editor for that field only (siblings unaffected); `false` restores editability. On iOS the editable-field highlight visibly disappears while locked.

Not yet covered (recommended before production): save-and-reopen persistence assertions, fields with multiple widgets, device rotation while the signature UI is open, and both-architecture runs of the same matrix on physical devices.

## Shipping the customization

Options, in order of preference for most teams:

1. **Fork** this repository, keep the feature branch rebased on SDK releases, and build the package from the fork.
2. **`patch-package`**: after validating in your app, run `node node_modules/@nutrient-sdk/react-native/scripts/create-bridge-patch.js` from the app root and commit the generated `patches/` directory. Revalidate the patch on every SDK upgrade — especially the class names called out below.
3. **Upstream**: propose the API to Nutrient; the surface is intentionally SDK-version-agnostic.

On SDK upgrades, re-verify the version-sensitive touch points: `PSPDFSignatureCreationViewController` / `PSPDFSignatureViewController` (iOS presented-controller type checks), `ElectronicSignatureFragment.FRAGMENT_TAG` (Android), and the `LOCKEDCONTENTS` widget-flag behavior.
