import * as React from 'react';

// @ts-ignore
import * as GeoViewport from '@mapbox/geo-viewport';
import { AnimatedRegion, Region } from 'react-native-maps';
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

export type Marker = {
  coordinate: Region;
  id: number | string;
} & any;

export type AnimatedMarker = {
  coordinate: AnimatedRegion;
  id: number | string;
  getCluster: (clusters: Cluster[]) => Cluster;
  getAnimatingRegion: (cluster: Cluster) => Region;
} & any;

/**
 * Create AnimatedMarker with the original value.
 * @param markers
 */
function createAnimatedMarkers(markers: Marker[]): AnimatedMarker[] {
  return markers.map((marker) => ({
    ...marker,
    coordinate: new AnimatedRegion({
      latitude: marker.coordinate.latitude,
      longitude: marker.coordinate.longitude,
      latitudeDelta: marker.coordinate.latitudeDelta === undefined ? 0 : marker.coordinate.latitudeDelta,
      longitudeDelta: marker.coordinate.longitudeDelta === undefined ? 0 : marker.coordinate.longitudeDelta,
    }),
    id: marker.id,

    /**
     * Get the cluster this marker belonging to
     * @param clusters all the clusters
     */
    getCluster: (clusters: Cluster[]) => {
      return clusters.find((cluster: Cluster) => (cluster.userExtension.markers || []).find((m) => m.id === marker.id));
    },

    /**
     * Get the animating region.
     * call when clustered marker clicks.
     *
     * @param cluster cluster this marker belonging to
     */
    getAnimatingRegion: (cluster: Cluster) => {
      const latitudes = cluster.userExtension.markers.map((m) => m.latitude);
      const longitudes = cluster.userExtension.markers.map((m) => m.longitude);
      const maxLatitude = Math.max.apply(null, latitudes.map((m) => Math.abs(m)));
      const maxLongitude = Math.max.apply(null, longitudes.map((m) => Math.abs(m)));
      const minLatitude = Math.min.apply(null, latitudes.map((m) => Math.abs(m)));
      const minLongitude = Math.min.apply(null, longitudes.map((m) => Math.abs(m)));
      return {
        latitude: marker.coordinate.latitude._value || marker.coordinate.latitude,
        longitude: marker.coordinate.longitude._value || marker.coordinate.longitude,
        longitudeDelta: maxLongitude - minLongitude || 0.1,
        latitudeDelta: maxLatitude - minLatitude || 0.1,
      };
    },
  }));
}

/**
 * test if the clusters are same
 * @param currentClusters
 * @param nextClusters
 */
function isSameCluster(currentClusters: Cluster[], nextClusters: Cluster[]): boolean {
  if (currentClusters.length !== nextClusters.length) {
    return false;
  }
  for (let i = 0; i < currentClusters.length; i++) {
    const currentCoordinate = currentClusters[i].userExtension.coordinate;
    const nextCoordinate = nextClusters[i].userExtension.coordinate;
    if (currentCoordinate.latitude !== nextCoordinate.latitude) {
      return false;
    }
    if (currentCoordinate.longitude !== nextCoordinate.longitude) {
      return false;
    }
  }
  return true;
}

type Props = {
  markers: Marker[];
  initialRegion: Region;
} & any;

type State = {
  animatedMarkers: AnimatedMarker[];
  clusters: Cluster[];
  region: Region;
} & any;

export const withAnimatedCluster = (options: {
  width: number;
  height: number;
  superClusterProvider: () => Supercluster;
  moveSpeed: number;
}) => {
  return <T extends Props = Props>(WrappedComponent: React.ComponentType<T>): React.ComponentType<T> => {
    return class extends React.Component<T, State> {
      private readonly superCluster: Supercluster;

      constructor(props: Props) {
        super(props);
        this.state = {
          animatedMarkers: [],
          clusters: [],
          region: props.initialRegion,
        };
        this.superCluster = options.superClusterProvider();

        this.onRegionChanged = this.onRegionChanged.bind(this);
      }

      public componentDidMount() {
        this.initialize();
      }

      /**
       * Recreate marker and cluster if the marker changed
       *
       * @param nextProps
       */
      public componentWillReceiveProps(nextProps: Props) {
        const prevLen = this.props.markers.length;
        const nextLen = nextProps.markers.length;
        if (nextLen !== prevLen) {
          this.initialize();
          return;
        }
        const prev = this.props.markers.map((marker: Marker) => marker.id).join('_');
        const next = nextProps.markers.map((marker: Marker) => marker.id).join('_');
        if (prev !== next) {
          this.initialize();
        }
      }

      /**
       * Render the wrapped component with additional props.
       */
      public render() {
        return (
          <WrappedComponent
            {...this.props}
            region={this.state.region}
            clusters={this.state.clusters}
            onRegionChanged={this.onRegionChanged}
            animatedMarkers={this.state.animatedMarkers}
          />
        );
      }

      /**
       * Create the clusters and animated markers.
       * Trigger when the marker changes.
       */
      private initialize() {
        const animatedMarkers = createAnimatedMarkers(this.props.markers);

        const defaultClusters = this.props.markers.map((marker: Marker) => ({
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

        this.onRegionChanged(this.state.region);
        this.setState({ animatedMarkers });
      }

      /**
       * Recreate the cluster by new Region.
       * Call on onRegionChangeCompleted
       *
       * @param region currentRegion
       */
      private onRegionChanged(region: Region) {
        const delta = region.longitudeDelta < 0 ? region.latitudeDelta + 360 : region.longitudeDelta;
        const boundingBox: [number, number, number, number] = [
          region.longitude - delta,
          region.latitude - region.latitudeDelta,
          region.longitude + delta,
          region.latitude + region.latitudeDelta,
        ];
        const viewport =
          region.longitudeDelta >= 40
            ? { zoom: 1 }
            : GeoViewport.viewport(boundingBox, [options.width, options.height]);
        const clusters = this.superCluster.getClusters(boundingBox, viewport.zoom);

        // @ts-ignore
        clusters.forEach((cluster: Cluster) => {
          if (cluster.properties.point_count === 0) {
            const marker = this.props.markers.find(
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
            // @ts-ignore
            this.superCluster.getChildren(cluster.properties.cluster_id).forEach((child: Cluster) => {
              this.addMarkersToTopCluster(child, cluster.userExtension.markers);
            });
          }
        });

        // @ts-ignore
        this.animateMarkersIfNeeded(clusters);
        this.setState({ region });
      }

      /**
       * Animate markers when the cluster changes.
       * @param nextClusters
       */
      private animateMarkersIfNeeded(nextClusters: Cluster[]) {
        const duration = options.moveSpeed;

        if (!isSameCluster(this.state.clusters, nextClusters)) {
          // release from cluster or move into cluster
          this.state.animatedMarkers.forEach((marker: Marker, index: number) => {
            const stayCluster = nextClusters.find((cluster: Cluster) =>
              cluster.userExtension.markers.find((m) => m.id === marker.id),
            );
            if (stayCluster) {
              // Clustering
              const animation = this.state.animatedMarkers[index].coordinate.timing({
                ...stayCluster.userExtension.coordinate,
                duration,
              });
              animation.start();
            } else {
              // Release
              const animation = this.state.animatedMarkers[index].coordinate.timing({
                latitude: marker.coordinate.latitude,
                longitude: marker.coordinate.longitude,
                duration,
              });
              animation.start();
            }
          });
        }

        this.setState({ clusters: nextClusters });
      }

      /**
       * Add the markers to the top level cluster.
       * @param cluster
       * @param markers
       */
      private addMarkersToTopCluster(cluster: Cluster, markers: Marker[]) {
        if (cluster.properties.point_count === 0) {
          const latLong = cluster.properties.item;
          const marker = this.props.markers.find(
            (m: Marker) => m.latitude === latLong.latitude && m.longitude === latLong.longitude,
          );
          if (marker) {
            markers.push(marker);
          }
        } else {
          // @ts-ignore
          this.superCluster.getChildren(cluster.properties.cluster_id).forEach((child: Cluster) => {
            this.addMarkersToTopCluster(child, markers);
          });
        }
      }
    };
  };
};
