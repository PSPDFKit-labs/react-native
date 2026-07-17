/*
 * Copyright © 2018-2026 PSPDFKit GmbH. All rights reserved.
 *
 * THIS SOURCE CODE AND ANY ACCOMPANYING DOCUMENTATION ARE PROTECTED BY INTERNATIONAL COPYRIGHT LAW
 * AND MAY NOT BE RESOLD OR REDISTRIBUTED. USAGE IS BOUND TO THE PSPDFKIT LICENSE AGREEMENT.
 * UNAUTHORIZED REPRODUCTION OR DISTRIBUTION IS SUBJECT TO CIVIL AND CRIMINAL PENALTIES.
 * This notice may not be removed from this file.
 */

package io.nutrient.react.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/**
 * Fabric event emitted when a signature form field is tapped while
 * interceptSignatureFields is enabled.
 */
class FabricOnSignatureFieldTappedEvent(
    surfaceId: Int,
    viewId: Int,
    private val fullyQualifiedName: String,
    private val pageIndex: Int
) : Event<FabricOnSignatureFieldTappedEvent>(surfaceId, viewId) {

    companion object {
        // Match Codegen's top-level name for BubblingEventHandler
        const val EVENT_NAME = "topSignatureFieldTapped"
    }

    override fun getEventName(): String = EVENT_NAME

    override fun getEventData(): WritableMap {
        val map = Arguments.createMap()
        map.putString("fullyQualifiedName", fullyQualifiedName)
        map.putInt("pageIndex", pageIndex)
        return map
    }
}
