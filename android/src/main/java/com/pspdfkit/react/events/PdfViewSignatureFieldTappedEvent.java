/*
 * PdfViewSignatureFieldTappedEvent.java
 *
 *   PSPDFKit
 *
 *   Copyright © 2021-2026 PSPDFKit GmbH. All rights reserved.
 *
 *   THIS SOURCE CODE AND ANY ACCOMPANYING DOCUMENTATION ARE PROTECTED BY INTERNATIONAL COPYRIGHT LAW
 *   AND MAY NOT BE RESOLD OR REDISTRIBUTED. USAGE IS BOUND TO THE PSPDFKIT LICENSE AGREEMENT.
 *   UNAUTHORIZED REPRODUCTION OR DISTRIBUTION IS SUBJECT TO CIVIL AND CRIMINAL PENALTIES.
 *   This notice may not be removed from this file.
 */

package com.pspdfkit.react.events;

import androidx.annotation.IdRes;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTEventEmitter;

/**
 * Event sent by the {@link com.pspdfkit.views.PdfView} when a signature form field was tapped
 * while signature interception is enabled.
 */
public class PdfViewSignatureFieldTappedEvent extends Event<PdfViewSignatureFieldTappedEvent> {

    public static final String EVENT_NAME = "pdfViewSignatureFieldTapped";

    @NonNull
    private final String fullyQualifiedName;
    private final int pageIndex;

    public PdfViewSignatureFieldTappedEvent(@IdRes int viewId, @NonNull String fullyQualifiedName, int pageIndex) {
        super(viewId);
        this.fullyQualifiedName = fullyQualifiedName;
        this.pageIndex = pageIndex;
    }

    @Override
    public String getEventName() {
        return EVENT_NAME;
    }

    @Override
    public void dispatch(RCTEventEmitter rctEventEmitter) {
        WritableMap eventData = Arguments.createMap();
        eventData.putString("fullyQualifiedName", fullyQualifiedName);
        eventData.putInt("pageIndex", pageIndex);
        rctEventEmitter.receiveEvent(getViewTag(), getEventName(), eventData);
    }
}
