/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import { Modality } from '@google/genai';

import BasicFace from '../basic-face/BasicFace';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { createSystemInstructions } from '@/lib/prompts';
import { useAgent, useUser } from '@/lib/state';
import type { Agent } from '@/lib/presets/agents';

export default function KeynoteCompanion() {
  const { client, connected, setConfig, connect, disconnect } =
    useLiveAPIContext();
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const user = useUser();
  const { current } = useAgent();

  const previousAgentRef = useRef<Agent>(current);
  const introPlayedForAgentId = useRef<string | null>(null);

  // Set the configuration for the Live API
  useEffect(() => {
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: current.voice },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: createSystemInstructions(current, user),
          },
        ],
      },
    });
  }, [setConfig, user, current]);

  // Effect to automatically handle agent switching
  useEffect(() => {
    const previousAgent = previousAgentRef.current;
    // Check if the agent has actually changed and has an intro
    if (current.id !== previousAgent.id && current.intro) {
      const switchAgentAndPlayIntro = async () => {
        // Disconnect if already connected
        if (connected) {
          disconnect();
        }
        // Reconnect to play the new agent's intro
        await connect();
      };
      switchAgentAndPlayIntro();
    }
    // Update the ref to the current agent for the next render cycle
    previousAgentRef.current = current;
  }, [current, connected, connect, disconnect]);

  // Initiate the session when the Live API connection is established
  useEffect(() => {
    const beginSession = async () => {
      if (!connected) return;

      // Check if an intro needs to be played for the current agent
      if (current.intro && introPlayedForAgentId.current !== current.id) {
        client.send(
          {
            text: current.intro,
          },
          true
        );
        introPlayedForAgentId.current = current.id;
      } else {
        // Fallback to the generic greeting
        client.send(
          {
            text: 'Greet the user and introduce yourself and your role.',
          },
          true
        );
      }
    };
    beginSession();
  }, [client, connected, current]);

  return (
    <div
      className="keynote-companion"
      // Fix: Added React to CSSProperties type cast to support custom CSS properties.
      style={{ '--agent-glow-color': current.bodyColor } as React.CSSProperties}
    >
      <BasicFace canvasRef={faceCanvasRef!} color={current.bodyColor} />
    </div>
  );
}
