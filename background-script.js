// this background script is used to invoke desktopCapture API
// to capture screen-MediaStream.

var screenOptions = ['screen', 'window', 'tab'];

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(portOnMessageHanlder);

    // this one is called for each message from "content-script.js"
    function portOnMessageHanlder(message) {
        console.log("message received in background-script: " + message);
        if(message == 'get-sourceId') {
            chrome.desktopCapture.chooseDesktopMedia(screenOptions, port.sender.tab, onAccessApproved);
        }

        if(message == 'audio-plus-tab') {
            screenOptions = ['audio', 'tab'];
            chrome.desktopCapture.chooseDesktopMedia(screenOptions, port.sender.tab, onAccessApproved);
        }
    }

    // on getting sourceId
    // "sourceId" will be empty if permission is denied.
    function onAccessApproved(sourceId, options) {
        // if "cancel" button is clicked
        if(!sourceId || !sourceId.length) {
            return port.postMessage('PermissionDeniedError');
        }

        console.debug("onAccessApproved and can requestAudioTrack: " + options.canRequestAudioTrack);
        // "ok" button is clicked; share "sourceId" with the
        // content-script which will forward it to the webpage
        port.postMessage({
            sourceId: sourceId,
            options: options
        });
    }
});
/*
 * Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Listens for external messages coming from pages that match url pattern
// defined in manifest.json
chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
        console.log("Got request", request, sender);
        if(request.getVersion) {
            sendResponse({ version: chrome.runtime.getManifest().version });
            return false; // Dispose of sendResponse
        } else if(request.getStream) {
            // Desktop video stream sources
            var sources = ["screen", "window"];
            if (request.sources) {
                // Default
                sources = request.sources;
            }

            // Tab for which the stream will be created (passed to
            // chrome.desktopCapture.chooseDesktopMedia).
            var tab = sender.tab;

            // If the streamId is requested from frame with different url than
            // its parent according to the documentation (
            // https://developer.chrome.com/extensions/desktopCapture ) -
            // "The stream can only be used by frames in the given tab whose
            // security origin matches tab.url." That's why we need to change
            // the url to the url of the frame (the frame is the sender).
            // Related ticket:
            // https://bugs.chromium.org/p/chromium/issues/detail?id=425344
            tab.url = sender.url;

            // Gets chrome media stream token and returns it in the response.
            chrome.desktopCapture.chooseDesktopMedia(
                sources, tab,
                function(streamId) {
                    sendResponse({ streamId: streamId });
                });
            return true; // Preserve sendResponse for future use
        } else {
            console.error("Unknown request");
            sendResponse({ error : "Unknown request" });
            return false;
        }
    }
);
