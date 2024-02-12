//
//  CustomPDFPageView.swift
//  react-native-pspdfkit
//
//  Created by Erhard Brand on 2024/02/12.
//

import PSPDFKit

@objc public class CustomPDFPageView: PDFPageView {
    
    public override func showDigitalSignatureMenu(forSignatureField signatureField: SignatureFormElement, animated: Bool) -> Bool {
        return false
    }
}
