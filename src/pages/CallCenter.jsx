import React, { useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CallCenter = () => {
    const jitsiContainerRef = useRef(null);
    const { user } = useAuth();
    const roomName = "FriendsHubGroupCall_GlobalCheckIn"; // Fixed room for simplicity

    useEffect(() => {
        // Load Jitsi Script
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => initJitsi();
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const initJitsi = () => {
        if (!window.JitsiMeetExternalAPI) return;

        // Clear container if reused
        if (jitsiContainerRef.current) jitsiContainerRef.current.innerHTML = "";

        const domain = "meet.jit.si";
        const options = {
            roomName: roomName,
            width: "100%",
            height: "100%",
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: user.username,
                email: user.email || undefined // We don't really capture email in this schema
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: false
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
                ],
            }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
    };

    return (
        <div className="h-[calc(100vh-8rem)] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Call Center</h2>
                    <p className="text-xs text-slate-400">Group Room: {roomName}</p>
                </div>
            </div>
            <div ref={jitsiContainerRef} className="flex-1 bg-black text-center flex items-center justify-center text-slate-500">
                Loading Jitsi Secure Connection...
            </div>
        </div>
    );
};

export default CallCenter;
