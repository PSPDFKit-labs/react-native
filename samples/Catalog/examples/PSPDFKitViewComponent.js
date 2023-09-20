import React from 'react';
import { processColor, View } from 'react-native';
import PSPDFKitView from 'react-native-pspdfkit';

import { exampleDocumentPath, pspdfkitColor } from '../configuration/Constants';
import { BaseExampleAutoHidingHeaderComponent } from '../helpers/BaseExampleAutoHidingHeaderComponent';
import { hideToolbar } from '../helpers/NavigationHelper';

import { MaterialHeaderButtons } from '../helpers/MyHeaderButtons';
import { Item } from 'react-navigation-header-buttons';

export class PSPDFKitViewComponent extends BaseExampleAutoHidingHeaderComponent {
  pdfRef = null;
  documentInteractionEnabled = true;

  constructor(props) {
    super(props);
    const { navigation } = this.props;
    this.pdfRef = React.createRef();
    hideToolbar(navigation);
    navigation.setOptions({
      headerRight: () => (
        <MaterialHeaderButtons>
          <Item
            title="add"
            iconName="lock-outline"
            onPress={() => this.toggleDocumentInteraction()}
          />
          {/* Adding blank button to add padding */}
          <Item
              title=""
              iconName=""
            />
        </MaterialHeaderButtons>
      ),
    });
  }

  async toggleDocumentInteraction() {

    this.documentInteractionEnabled ? await this.pdfRef.current.disableDocumentInteraction() : await this.pdfRef.current.enableDocumentInteraction();
    this.documentInteractionEnabled = !this.documentInteractionEnabled
  }

  render() {
    const { navigation } = this.props;

    return (
      <View style={styles.flex}>
        <PSPDFKitView
          ref={this.pdfRef}
          document={exampleDocumentPath}
          configuration={{
            allowToolbarTitleChange: false,
            toolbarTitle: 'My Awesome Report',
            backgroundColor: processColor('lightgrey'),
            useParentNavigationBar: false,
          }}
          fragmentTag="PDF1"
          showNavigationButtonInToolbar={true}
          onNavigationButtonClicked={() => navigation.goBack()}
          style={styles.pdfColor}
        />
      </View>
    );
  }
}
const styles = {
  flex: { flex: 1 },
  pdfColor: { flex: 1, color: pspdfkitColor },
};
