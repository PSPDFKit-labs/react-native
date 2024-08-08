import React from 'react';
import { Alert, Button, Image, processColor, View } from 'react-native';
import PSPDFKitView from 'react-native-pspdfkit';

import { exampleDocumentPath, pspdfkitColor } from '../configuration/Constants';
import { BaseExampleAutoHidingHeaderComponent } from '../helpers/BaseExampleAutoHidingHeaderComponent';
import { hideToolbar } from '../helpers/NavigationHelper';
import { PSPDFKit } from '../helpers/PSPDFKit';

export class PSPDFKitViewComponent extends BaseExampleAutoHidingHeaderComponent {
  pdfRef: React.RefObject<PSPDFKitView>;

  constructor(props: any) {
    super(props);
    const { navigation } = this.props;
    this.pdfRef = React.createRef();
    hideToolbar(navigation);
    this.state = {
      base64Data: '',
    };
  }

  override componentDidMount() {
    PSPDFKit.generatePDFThumbnail(exampleDocumentPath)
    // @ts-ignore
      .then((data) => {
        this.setState({ base64Data: data });
      })
      .catch((error: Error) => {
        console.log(error.message);
      });
  }

  override render() {
    return (
      <View style={styles.flex}>
        <Image source={{uri: `data:image/png;base64,${this.state.base64Data}`}} 
               style={{ width:200, height:200, resizeMode: 'contain' }} />
      </View>
    );
  }
}
const styles = {
  flex: { flex: 1 },
  pdfColor: { flex: 1, color: pspdfkitColor },
  wrapper: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    padding: 10,
  },
};
