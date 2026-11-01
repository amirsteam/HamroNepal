/**
 * HamroNepal - Public News Website
 *
 * Main application entry point.
 */

import { RouterProvider } from "react-router-dom";
import { LazyMotion, MotionConfig } from "motion/react";
import { router } from "./router";
import { AuthProvider } from "@/contexts/AuthContext";

const loadMotionFeatures = () => import("@/lib/motionFeatures").then((mod) => mod.default);

function App() {
  return (
    // LazyMotion loads the animation features after the page appears, so the
    // first download stays small; reducedMotion="user" drops movement for
    // readers who ask for less motion.
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  );
}

export default App;
