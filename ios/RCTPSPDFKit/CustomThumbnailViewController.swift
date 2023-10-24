//
//  CustomThumbnailViewController.swift
//  react-native-pspdfkit
//
//  Created by Erhard Brand on 2023/10/24.
//

import PSPDFKit
import PSPDFKitUI

@objc public class CustomThumbnailViewController: ThumbnailViewController {
    public override func pages(forFilter filter: ThumbnailViewFilter, groupingResultsBy groupSize: UInt, result resultHandler: @escaping (IndexSet) -> Void, completion: @escaping (Bool) -> Void) -> PSPDFKit.Progress? {
        // Only shows pages with note annotations.
        if filter == .annotations {
            guard let pagesWithNoteAnnotations = document?.allAnnotations(of: .note).map({ $0.key.intValue }) else {
                return nil
            }

            var annotationIndexes: IndexSet = []
            pagesWithNoteAnnotations.forEach { annotationIndexes.insert($0) }

            resultHandler(annotationIndexes)
            completion(true)
            return nil
        }

        return super.pages(forFilter: filter, groupingResultsBy: groupSize, result: resultHandler, completion: completion)
    }
}
