import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
    onMove: (vector: { x: number; y: number }) => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
    const [active, setActive] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Current stick position relative to center
    const [origin, setOrigin] = useState({ x: 0, y: 0 });     // Center of the joystick on screen
    
    // Config
    const maxRadius = 50; // Max distance the stick can move
    
    const touchIdRef = useRef<number | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Prevent default to avoid scrolling
        // e.preventDefault(); 
        
        // Only accept if we aren't already tracking a touch
        if (touchIdRef.current !== null) return;

        const touch = e.changedTouches[0];
        touchIdRef.current = touch.identifier;

        // Set the joystick origin to where the touch started (Dynamic Joystick)
        // or we could use a fixed position. Let's use a fixed position area interaction
        // but center the visual joystick on the initial touch for better UX ("Floating" behavior).
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        setOrigin({ x, y });
        setPosition({ x: 0, y: 0 });
        setActive(true);
        onMove({ x: 0, y: 0 });
    }, [onMove]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchIdRef.current === null) return;

        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
        if (!touch) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Calculate delta from origin
        let dx = touchX - origin.x;
        let dy = touchY - origin.y;

        // Cap distance at maxRadius
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxRadius;
            dy = Math.sin(angle) * maxRadius;
        }

        setPosition({ x: dx, y: dy });

        // Normalize output
        const normalizedX = dx / maxRadius;
        const normalizedY = dy / maxRadius;
        onMove({ x: normalizedX, y: normalizedY });

    }, [active, origin, onMove]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchIdRef.current === null) return;
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
        if (!touch) return;

        // Reset
        touchIdRef.current = null;
        setActive(false);
        setPosition({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
    }, [onMove]);

    return (
        <div
            className="absolute bottom-0 left-0 w-1/2 h-1/2 z-50 touch-none"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Visuals only appear when active */}
            {active && (
                <div 
                    className="absolute w-24 h-24 rounded-full bg-white/10 border-2 border-white/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: origin.x, top: origin.y }}
                >
                    <div 
                        className="absolute w-12 h-12 rounded-full bg-white/50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}
                    />
                </div>
            )}
             {/* Hint text if not active */}
             {!active && (
                 <div className="absolute bottom-12 left-12 text-white/20 text-sm pointer-events-none animate-pulse">
                     Drag to Move
                 </div>
             )}
        </div>
    );
};

export default VirtualJoystick;
