import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import NutrientView from '@nutrient-sdk/react-native';

import {
  formDocumentName,
  formDocumentPath,
  pspdfkitColor,
  writableFormDocumentPath,
} from '../configuration/Constants';
import {
  renderWithBaseExampleSafeArea,
  useBaseExampleAutoHidingHeader,
} from '../helpers/ExampleScreenLayoutHelpers';
import { extractFromAssetsIfMissing } from '../helpers/FileSystemHelpers';

/**
 * Test screen for the signature interception and form field read-only bridge:
 * - interceptSignatureFields + onSignatureFieldTapped
 * - setFormFieldReadOnly
 * - dismissSignaturePad
 */
export const SignatureInterception = ({ navigation }: any) => {
  const pdfRef = useRef<NutrientView | null>(null);
  const [intercept, setIntercept] = useState(true);
  const [status, setStatus] = useState('ready');
  const [documentPath, setDocumentPath] = useState(formDocumentPath);
  useBaseExampleAutoHidingHeader(navigation);

  useEffect(() => {
    // Forms are not editable on read-only android_asset documents, so copy the
    // document to a writable location first.
    extractFromAssetsIfMissing(formDocumentName, () => {
      setDocumentPath(writableFormDocumentPath);
    });
  }, []);

  const lockField = async (readOnly: boolean) => {
    try {
      const result = await (pdfRef.current as any)?.setFormFieldReadOnly(
        'Name_Last',
        readOnly,
        true,
      );
      setStatus(`readOnly=${readOnly} result=${result}`);
    } catch (error: any) {
      setStatus(`readOnly error: ${error?.message ?? JSON.stringify(error)}`);
    }
  };

  const dismissPad = async () => {
    try {
      const result = await (pdfRef.current as any)?.dismissSignaturePad();
      setStatus(`dismissed=${result}`);
    } catch (error: any) {
      setStatus(`dismiss error: ${error?.message ?? JSON.stringify(error)}`);
    }
  };

  const dismissPadDelayed = () => {
    setStatus('dismissing in 4s...');
    setTimeout(dismissPad, 4000);
  };

  return (
    <View style={styles.flex}>
      <NutrientView
        ref={pdfRef}
        document={documentPath}
        interceptSignatureFields={intercept}
        onSignatureFieldTapped={(event: any) => {
          setStatus(
            `sigTapped name=${event.fullyQualifiedName} page=${event.pageIndex}`,
          );
        }}
        configuration={{
          documentLabelEnabled: false,
          disableAutomaticSaving: true,
        }}
        style={styles.pdfColor}
      />
      {renderWithBaseExampleSafeArea(insets => (
        <View style={[styles.column, { paddingBottom: insets.bottom }]}>
          <Text accessibilityLabel="status" testID="status" style={styles.status}>
            {status}
          </Text>
          <View style={styles.horizontalContainer}>
            <TouchableOpacity
              onPress={() => {
                setIntercept(!intercept);
                setStatus(`intercept=${!intercept}`);
              }}
              accessibilityLabel="Toggle Intercept">
              <Text style={styles.button}>{`Intercept: ${intercept ? 'ON' : 'OFF'}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => lockField(true)} accessibilityLabel="Lock Field">
              <Text style={styles.button}>Lock</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => lockField(false)} accessibilityLabel="Unlock Field">
              <Text style={styles.button}>Unlock</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissPad} accessibilityLabel="Dismiss Pad">
              <Text style={styles.button}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissPadDelayed} accessibilityLabel="Dismiss Pad Delayed">
              <Text style={styles.button}>Dismiss 4s</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = {
  flex: { flex: 1 },
  pdfColor: { flex: 1, color: pspdfkitColor },
  status: {
    fontSize: 13,
    padding: 6,
    color: '#333333',
    backgroundColor: '#ffffcc',
  },
  column: {
    flexDirection: 'column' as 'column',
    alignItems: 'center' as 'center',
    overflow: 'visible' as 'visible',
  },
  horizontalContainer: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    padding: 6,
    overflow: 'visible' as 'visible',
  },
  button: {
    padding: 8,
    fontSize: 13,
    color: pspdfkitColor,
    textAlign: 'center' as 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginHorizontal: 3,
  },
};
