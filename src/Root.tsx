import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { BridgeShort as SkyscraperShort, BRIDGE_FRAMES as SKYSCRAPER_FRAMES } from "./videos/skyscraper/Bridge";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SkyscraperShort"
        component={SkyscraperShort}
        durationInFrames={SKYSCRAPER_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BridgeShort"
        component={BridgeShort}
        durationInFrames={BRIDGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
