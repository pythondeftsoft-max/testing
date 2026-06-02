import { useMemo } from 'react';
import Supercluster from 'supercluster';

export type PointFeature = {
  type: 'Feature';
  properties: Record<string, any> & { cluster?: boolean };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

interface UseSuperclusterResult {
  clusters: Array<Supercluster.PointFeature<any> | Supercluster.ClusterFeature<any>>;
  supercluster: Supercluster<any, any> | null;
}

// Simple supercluster hook for pigeon-maps
export default function useSupercluster(
  points: PointFeature[],
  bounds: [number, number, number, number] | null,
  zoom: number,
  options?: Partial<Supercluster.Options<any, any>>
): UseSuperclusterResult {
  const index = useMemo(() => {
    const sc = new Supercluster({
      radius: 40,
      maxZoom: 12,
      minPoints: 2,
      ...options,
    });
    sc.load(points as any);
    return sc;
  }, [points, options?.radius, options?.maxZoom, options?.minPoints]);

  const clusters = useMemo(() => {
    if (!bounds) return points as any;
    const z = Math.max(0, Math.floor(zoom || 0));
    try {
      return index.getClusters(bounds, z);
    } catch {
      return points as any;
    }
  }, [index, bounds, zoom, points]);

  return { clusters, supercluster: index };
}
