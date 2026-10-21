"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden bg-slate-950/10 dark:bg-slate-950/35">
      {/* Light Mode Organic Wave Background */}
      <motion.div
        className="absolute inset-0 dark:opacity-0 transition-opacity duration-1000 ease-in-out"
        animate={{
          scale: [2.0, 2.22, 2.0],
          x: ["-5%", "5%", "-5%"],
          y: ["-4%", "4%", "-4%"],
          rotate: [-1.5, 1.5, -1.5],
        }}
        transition={{
          scale: { duration: 45, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 62, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 78, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 90, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Image
          src="/bg-light.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover filter blur-[20px] brightness-105 contrast-105"
        />
      </motion.div>

      {/* Dark Mode Organic Wave Background */}
      <motion.div
        className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-1000 ease-in-out"
        animate={{
          scale: [2.0, 2.25, 2.0],
          x: ["5%", "-5%", "5%"],
          y: ["4%", "-4%", "4%"],
          rotate: [1.5, -1.5, 1.5],
        }}
        transition={{
          scale: { duration: 48, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 65, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 82, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 95, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Image
          src="/bg-dark.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover filter blur-[20px] brightness-50 contrast-120"
        />
      </motion.div>
    </div>
  );
};
