"use client";

import React from "react";
import { motion } from "framer-motion";
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from "@/lib/motion";

export const ScrollMotion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={STAGGER_CONTAINER_VARIANTS}
    >
      {React.Children.map(children, (child, idx) =>
        React.isValidElement(child) ? (
          <motion.div key={idx} variants={STAGGER_ITEM_VARIANTS}>
            {child}
          </motion.div>
        ) : (
          child
        )
      )}
    </motion.div>
  );
};
