import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls } from '@react-three/drei';

function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

export default function Viewer3D({ url, height = '300px' }: { url: string; height?: string }) {
    if (!url) return null;

    return (
        <Canvas dpr={[1, 2]} camera={{ fov: 45 }} style={{ height, width: '100%' }}>
            <color attach="background" args={['#0f0f0f']} />
            <PresentationControls speed={1.5} global zoom={0.7} polar={[-0.1, Math.PI / 4]}>
                <Stage environment="city" intensity={0.6}>
                    <Model url={url} />
                </Stage>
            </PresentationControls>
        </Canvas>
    );
}
