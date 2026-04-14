import { createContext, useContext, type ReactNode } from "react";
import type { SpotlightInstance } from "./spotlight";

const SpotlightContext = createContext<SpotlightInstance | null>(null);

export interface SpotlightProviderProps {
  instance: SpotlightInstance;
  children: ReactNode;
}

/**
 * Provide a SpotlightInstance to all descendant overlay/trigger components.
 * This is optional — components work without a provider using default behavior.
 *
 * @example
 * ```tsx
 * const spotlight = createSpotlight({ extensions: [analytics] });
 *
 * function App() {
 *   return (
 *     <SpotlightProvider instance={spotlight}>
 *       <MyApp />
 *     </SpotlightProvider>
 *   );
 * }
 * ```
 */
export function SpotlightProvider({ instance, children }: SpotlightProviderProps) {
  return (
    <SpotlightContext.Provider value={instance}>
      {children}
    </SpotlightContext.Provider>
  );
}

/**
 * Access the nearest SpotlightInstance from context. Returns `null` if no provider is present.
 */
export function useSpotlightInstance(): SpotlightInstance | null {
  return useContext(SpotlightContext);
}
