"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type MotionBlockProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function MotionBlock({ children, className, delay = 0 }: MotionBlockProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
