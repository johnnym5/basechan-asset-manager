"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

export const AmbientBackground: React.FC = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Subtle Mouse Parallax Coordinates
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 40, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 30 });

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (event: MouseEvent) => {
      if (typeof window === "undefined") return;
      const { innerWidth, innerHeight } = window;
      const offsetX = (event.clientX / innerWidth - 0.5) * 25; // max ±25px offset
      const offsetY = (event.clientY / innerHeight - 0.5) * 25;
      mouseX.set(offsetX);
      mouseY.set(offsetY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  const isDark = theme === "dark";
  const bgImageSrc = isDark ? "/bg-dark.jpg" : "/bg-light.jpg";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none bg-[var(--bg-primary)]"
    >
      {/* Framer Motion Living 3D Animated Image Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={bgImageSrc}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ x: springX, y: springY }}
          className="absolute inset-0 w-full h-full"
        >
          <motion.div
            animate={{
              scale: [1.05, 1.16, 1.08, 1.18, 1.05],
              x: ["0%", "2.5%", "-2%", "1.5%", "0%"],
              y: ["0%", "-2%", "2.5%", "-1.5%", "0%"],
              rotate: [0, 1.2, -1, 0.8, 0],
            }}
            transition={{
              duration: 40,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            className="relative w-[115%] h-[115%] -top-[7.5%] -left-[7.5%]"
          >
            <Image
              src={bgImageSrc}
              alt=""
              fill
              priority
              quality={90}
              className="object-cover object-center transform-gpu"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Darkening & Radial Vignette Overlay for Crisp Readability */}
      <div
        className={`absolute inset-0 transition-colors duration-700 ${
          isDark
            ? "bg-[#030914]/80 backdrop-blur-[2px]"
            : "bg-slate-100/75 backdrop-blur-[2px]"
        }`}
      />

      {/* Ambient Gradient Mesh Wash */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isDark
            ? "bg-gradient-to-tr from-[#020617] via-transparent to-[#0f172a]/60 opacity-90"
            : "bg-gradient-to-tr from-slate-100 via-transparent to-blue-50/50 opacity-80"
        }`}
      />
    </div>
  );
};
