import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Bounds, Center, Environment, OrbitControls, useBounds } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { Button } from '@/components/ui/Button';

function Model({ url, wireframe }: { url: string; wireframe: boolean }) {
  const geometry = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);
  const bounds = useBounds();

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#e8e1d8',
      metalness: 0.1,
      roughness: 0.55,
      wireframe,
    });
    return m;
  }, [wireframe]);

  useEffect(() => {
    if (meshRef.current) {
      geometry.computeVertexNormals();
      bounds.refresh(meshRef.current).fit();
    }
  }, [geometry, bounds]);

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />;
}

export function STLViewer({ url, fileName }: { url: string; fileName?: string }) {
  const [wireframe, setWireframe] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="relative h-[520px] rounded-2xl border border-border overflow-hidden bg-[radial-gradient(circle_at_center,_#f8fafc,_#e2e8f0)]">
      <Canvas shadows camera={{ position: [0, 0, 120], fov: 40 }} key={resetKey}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.1} castShadow />
        <directionalLight position={[-10, -5, -10]} intensity={0.4} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <Model url={url} wireframe={wireframe} />
            </Center>
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>

      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {fileName && (
          <span className="px-3 py-1 rounded-lg bg-card/90 backdrop-blur text-xs font-medium border border-border">
            {fileName}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" size="sm" onClick={() => setWireframe((v) => !v)}>
            {wireframe ? 'Sólido' : 'Wireframe'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setResetKey((k) => k + 1)}>
            Reiniciar cámara
          </Button>
        </div>
      </div>
    </div>
  );
}
