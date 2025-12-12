import React, { useState, useEffect } from 'react';
import { Brain, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MemoryIndicator({ show, memoryType = 'fact', content }) {
    const [visible, setVisible] = useState(show);

    useEffect(() => {
        if (show) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [show]);

    const memoryIcons = {
        preference: '⚙️',
        fact: '💡',
        project: '🚀',
        context: '📝',
        instruction: '🎯'
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="fixed top-20 right-4 z-50 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm"
                >
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 animate-pulse" />
                        <span className="text-lg">{memoryIcons[memoryType]}</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Mémoire L1 activée
                        </p>
                        {content && (
                            <p className="text-xs opacity-90 mt-1 line-clamp-2">{content}</p>
                        )}
                    </div>
                    <Zap className="w-4 h-4 text-yellow-300" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}