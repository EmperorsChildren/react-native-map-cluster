// @ts-ignore
import * as GeoViewport from '@mapbox/geo-viewport';
import { AnimatedRegion, Region } from 'react-native-maps';
// @ts-ignore
import Supercluster from 'supercluster';

export interface Cluster {
  properties: {
    item: {
      latitude: number;
      longitude: number;
    };
    cluster_id: any;
    point_count: number;
  };
  geometry?: any;
  userExtension: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
    markers: Marker[];
  };
}

type Marker = {
  coordinate: Region;
  id: number | string;
} & any;

interface AnimatedMarker {
  coordinate: AnimatedRegion;
  id: number | string;
}

function createAnimatedMarkers(markers: Marker[]): AnimatedMarker[] {
  return markers.map((marker) => ({
    coordinate: new AnimatedRegion({
      latitude: marker.coordinate.latitude,
      longitude: marker.coordinate.longitude,
      latitudeDelta: marker.coordinate.latitudeDelta === undefined ? 0 : marker.coordinate.latitudeDelta,
      longitudeDelta: marker.coordinate.longitudeDelta === undefined ? 0 : marker.coordinate.longitudeDelta,
    }),
    id: marker.id,
  }));
}

function isSameCluster(currentClusters: Cluster[], nextClusters: Cluster[]): boolean {
  if (currentClusters.length !== nextClusters.length) {
    return false;
  }
  for (let i = 0; i < currentClusters.length; i++) {
    const currentCoordinate = currentClusters[i].userExtension!!.coordinate;
    const nextCoordinate = nextClusters[i].userExtension!!.coordinate;
    if (currentCoordinate.latitude !== nextCoordinate.latitude) {
      return false;
    }
    if (currentCoordinate.longitude !== nextCoordinate.longitude) {
      return false;
    }
  }
  return true;
}

export class AnimatedCluster {
  public readonly markers: Marker[];
  public readonly animatedMarkers: AnimatedMarker[];
  public clusters: Cluster[] = [];

  private superCluster?: Supercluster;

  private readonly dimensionWidth: number;
  private readonly dimensionHeight: number;

  /**
   * this creates new clusters.
   * call on componentDidMount / componentWillReceiveProps or getDerivedStateFromProps.
   *
   * @param region current region
   * @param markers rendering target markers
   * @param width dimension width
   * @param height dimension height
   */
  public constructor(region: Region, markers: Marker[], width: number, height: number) {
    this.dimensionWidth = width;
    this.dimensionHeight = height;
    this.markers = markers;
    this.animatedMarkers = createAnimatedMarkers(markers);
    this.createInitialClusters(region);
  }

  /**
   * this creates new clusters and animate markers.
   * Call on onRegionChangeCompleted
   *
   * @param region currentRegion
   */
  public onRegionChanged(region: Region) {
    const delta = region.longitudeDelta < 0 ? region.latitudeDelta + 360 : region.longitudeDelta;
    const boundingBox = [
      region.longitude - delta,
      region.latitude - region.latitudeDelta,
      region.longitude + delta,
      region.latitude + region.latitudeDelta,
    ];
    const viewport =
      region.longitudeDelta >= 40
        ? { zoom: 1 }
        : GeoViewport.viewport(boundingBox, [this.dimensionWidth, this.dimensionHeight]);
    const clusters = this.superCluster.getCusters(boundingBox, viewport);
    clusters.forEach((cluster: Cluster) => {
      if (cluster.properties.point_count === 0) {
        const marker = this.markers.find(
          (m: Marker) =>
            m.coordinate.latitude === cluster.properties.item.latitude &&
            m.coordinate.longitude === cluster.properties.item.longitude,
        );

        cluster.userExtension = {
          coordinate: cluster.properties.item,
          markers: marker ? [marker] : [],
        };
      } else {
        cluster.userExtension = {
          coordinate: {
            latitude: cluster.geometry.coordinates[1],
            longitude: cluster.geometry.coordinates[0],
          },
          markers: [],
        };
        // add markers of child clusters
        this.superCluster.getChildren(cluster.properties.cluster_id).forEach((child: Cluster) => {
          this._addMarkersToTopCluster(child, cluster.userExtension.markers);
        });
      }
    });

    this.animateMarkersIfNeeded(clusters);

    this.clusters = clusters;
  }

  /**
   * Create new Clusters by current region
   *
   * @param region
   */
  private createInitialClusters(region: Region) {
    this.superCluster = new Supercluster();

    const defaultClusters = this.markers.map((marker) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [marker.coordinate.longitude, marker.coordinate.latitude],
      },
      properties: {
        point_count: 0,
        item: marker,
      },
    }));
    this.superCluster.load(defaultClusters);

    this.onRegionChanged(region);
  }

  private animateMarkersIfNeeded(nextClusters: Cluster[]) {
    const duration = 600;

    if (!isSameCluster(this.clusters, nextClusters)) {
      // release from cluster or move into cluster
      this.animatedMarkers.forEach((marker: Marker, index: number) => {
        const stayCluster = nextClusters.find((cluster: Cluster) =>
          cluster.userExtension.markers.find((m) => m === marker),
        );
        if (stayCluster) {
          // Clustering
          this.animatedMarkers[index].coordinate.timing({
            ...stayCluster.userExtension.coordinate,
            duration,
          });
        } else {
          // Release
          this.animatedMarkers[index].coordinate.timing({
            latitude: marker.coordinate.latitude,
            longitude: marker.coordinate.longitude,
            duration,
          });
        }
      });
    }
  }

  private _addMarkersToTopCluster(cluster: Cluster, markers: Marker[]) {
    if (cluster.properties.point_count === 0) {
      const latLong = cluster.properties.item;
      const marker = this.markers.find(
        (m: Marker) => m.latitude === latLong.latitude && m.longitude === latLong.longitude,
      );
      if (marker) {
        markers.push(marker);
      }
    } else {
      this.superCluster.getChildren(cluster.properties.cluster_id).forEach((child: Cluster) => {
        this._addMarkersToTopCluster(child, markers);
      });
    }
  }
}
