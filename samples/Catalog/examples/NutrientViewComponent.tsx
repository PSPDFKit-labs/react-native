import React from 'react';
import { Alert, Platform, processColor, Text, TouchableOpacity, View } from 'react-native';
import NutrientView, { PDFConfiguration, Annotation } from '@nutrient-sdk/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exampleDocumentPath, pspdfkitColor } from '../configuration/Constants';
import { BaseExampleAutoHidingHeaderComponent } from '../helpers/BaseExampleAutoHidingHeaderComponent';
import { hideToolbar } from '../helpers/NavigationHelper';
import { Nutrient } from '../helpers/Nutrient';

export class NutrientViewComponent extends BaseExampleAutoHidingHeaderComponent {
  pdfRef: React.RefObject<NutrientView | null>;
  
  // Add state for menuItemGrouping
  override state = {
    menuItemGrouping: ['ink', 'freetext', 'eraser', 'signature'] as string[]
  };
  
  constructor(props: any) {
    super(props);
    const { navigation } = this.props;
    this.pdfRef = React.createRef();
    hideToolbar(navigation);
  }
  
  // Method to update menuItemGrouping
  updateMenuItemGrouping = async (newGrouping: string[]) => {

    this.setState({ menuItemGrouping: newGrouping });

    Platform.OS === 'android'
    ? await this.pdfRef?.current?.exitCurrentlyActiveMode()
    : null;
    setTimeout(async () => {
      await this.pdfRef.current?.enterAnnotationCreationMode(newGrouping[0] as Annotation.Type);
    }, 200);
  };
  
  // Methods for specific button actions
  setInkGrouping = () => {
    this.updateMenuItemGrouping(['ink']);
  };
  
  setHighlightGrouping = () => {
    this.updateMenuItemGrouping(['highlight']);
  };
  
  setNoteGrouping = () => {
    this.updateMenuItemGrouping(['note']);
  };
  
  setSignatureGrouping = () => {
    this.updateMenuItemGrouping(['signature']);
  };
  
  override render() {
    const { navigation } = this.props;
    const { menuItemGrouping } = this.state;

    return (
      <View style={styles.flex}>
        <NutrientView
          ref={this.pdfRef}
          document={exampleDocumentPath}
          menuItemGrouping={menuItemGrouping}
          configuration={{
            iOSAllowToolbarTitleChange: false,
            toolbarTitle: 'My Awesome Report',
            iOSBackgroundColor: processColor('lightgrey'),
            iOSUseParentNavigationBar: false,
            iOSDocumentInfoOptions: [PDFConfiguration.IOSDocumentInfoOption.OUTLINE, PDFConfiguration.IOSDocumentInfoOption.ANNOTATIONS],
          }}
          onReady={() => {
            console.log('NutrientView is ready');
          }}
          fragmentTag="PDF1"
          showNavigationButtonInToolbar={true}
          onNavigationButtonClicked={() => navigation.goBack()}
          style={styles.pdfColor}
        />
        {this.renderWithSafeArea(insets => (
          <View style={[styles.column, { paddingBottom: insets.bottom }]}>
            <View>
              {/* New section for menuItemGrouping controls */}
              <View style={styles.groupingControls}>
                <Text style={styles.sectionTitle}>Menu Item Grouping Controls</Text>
                <Text style={styles.currentGrouping}>Current: {menuItemGrouping.join(', ')}</Text>
                
                <View style={styles.buttonGrid}>
                  <TouchableOpacity onPress={this.setInkGrouping} style={styles.groupingButton}>
                    <Text style={styles.buttonText}>Ink</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={this.setHighlightGrouping} style={styles.groupingButton}>
                    <Text style={styles.buttonText}>Highlight</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={this.setNoteGrouping} style={styles.groupingButton}>
                    <Text style={styles.buttonText}>Note</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={this.setSignatureGrouping} style={styles.groupingButton}>
                    <Text style={styles.buttonText}>Signature</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }
}
const styles = {
  flex: { flex: 1 },
  pdfColor: { flex: 1, color: pspdfkitColor },
  column: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  },
  horizontalContainer: {
    flexDirection: 'row' as const,
    minWidth: '70%' as const,
    height: 50,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  button: {
    padding: 15,
    flex: 1,
    fontSize: 16,
    color: pspdfkitColor,
    textAlign: 'center' as const,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  groupingControls: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '90%' as const,
    alignItems: 'center' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 10,
    color: pspdfkitColor,
  },
  currentGrouping: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  buttonGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-around' as const,
    width: '100%' as const,
  },
  groupingButton: {
    backgroundColor: pspdfkitColor,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    width: '45%' as const,
    alignItems: 'center' as const,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  customInputButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    width: '90%' as const,
    alignItems: 'center' as const,
  },
};