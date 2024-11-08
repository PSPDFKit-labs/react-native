import React from 'react';
import { Alert, Button, Platform, processColor, View } from 'react-native';
import PSPDFKitView, { Toolbar } from 'react-native-pspdfkit';

import { exampleDocumentPath, pspdfkitColor } from '../configuration/Constants';
import { BaseExampleAutoHidingHeaderComponent } from '../helpers/BaseExampleAutoHidingHeaderComponent';

export class ToolbarCustomization extends BaseExampleAutoHidingHeaderComponent {
  pdfRef: React.RefObject<PSPDFKitView>;

  constructor(props: any) {
    super(props);
    this.pdfRef = React.createRef();
    this.state = {
      menuItemGroupingItems: ['highlight']
    };
  }

  override render() {
    return (
      <View style={styles.fullScreen}>
        <PSPDFKitView
          ref={this.pdfRef}
          document={exampleDocumentPath}
          configuration={{
            iOSBackgroundColor: processColor('lightgrey'),
            iOSUseParentNavigationBar: false,
          }}
          toolbar={{
            // iOS only.
            leftBarButtonItems: {
              viewMode: Toolbar.PDFViewMode.VIEW_MODE_DOCUMENT,
              animated: true,
              buttons: [
                Toolbar.DefaultToolbarButton.EMAIL_BUTTON_ITEM,
              ],
            },
            // iOS only.
            rightBarButtonItems: {
              viewMode: Toolbar.PDFViewMode.VIEW_MODE_DOCUMENT,
              animated: true,
              buttons: [
                Toolbar.DefaultToolbarButton.ANNOTATION_BUTTON_ITEM,
              ],
            },
            // Android only.
            toolbarMenuItems: {
              buttons: [
                Toolbar.DefaultToolbarButton.ANNOTATION_BUTTON_ITEM,
              ],
            },
          }}
          onCustomToolbarButtonTapped={(event: any) => {
            Alert.alert('PSPDFKit', `Custom button tapped: ${JSON.stringify(event)}`);
          }}
          menuItemGrouping={this.state.menuItemGroupingItems}
          style={styles.pdfColor}
        />
        <View style={styles.wrapperView}>
          <View style={styles.marginLeft}>
            <Button
              onPress={async () => {
                this.setState({
                  menuItemGroupingItems: ['signature']
                })
                if (Platform.OS === 'android') {
                  this.pdfRef.current?.exitCurrentlyActiveMode();
                  this.pdfRef.current?.enterAnnotationCreationMode();
                }
              }}
              title="Set Toolbar Items"
              accessibilityLabel="Set Toolbar Items"
            />
          </View>
          <View style={styles.marginLeft}>
            <Button
              onPress={async () => {
                if (Platform.OS === 'android') {
                  Alert.alert('PSPDFKit', 'Not supported on Android');
                  return;
                }
                const toolbarItems = await this.pdfRef.current?.getToolbar();
                Alert.alert('PSPDFKit', JSON.stringify(toolbarItems));
              }}
              title="Get Toolbar Items"
            />
          </View>
        </View>
      </View>
    );
  }
}

const styles = {
  fullScreen: { flex: 1 },
  wrapperView: {
    flexDirection: 'row' as 'row',
    height: 60,
    alignItems: 'center' as 'center',
    padding: 10,
  },
  marginLeft: { marginLeft: 10 },
  pdfColor: { flex: 1, color: pspdfkitColor },
};
