import GeoViewport from '@placemarkio/geo-viewport';
import * as React from 'react';
import { AnimatedRegion } from 'react-native-maps';
/**
 * Create AnimatedMarker with the original value.
 * @param markers
 */
function createAnimatedMarkers(markers) {
    return markers.map((marker) => ({
        ...marker,
        coordinate: new AnimatedRegion({
            latitude: marker.coordinate.latitude,
            longitude: marker.coordinate.longitude,
            latitudeDelta: marker.coordinate.latitudeDelta === undefined
                ? 0
                : marker.coordinate.latitudeDelta,
            longitudeDelta: marker.coordinate.longitudeDelta === undefined
                ? 0
                : marker.coordinate.longitudeDelta,
        }),
        id: marker.id,
        getCluster: (clusters) => {
            return clusters.find((cluster) => (cluster.userExtension.markers || []).find((m) => m.id === marker.id));
        },
    }));
}
/**
 * test if the clusters are same
 * @param currentClusters
 * @param nextClusters
 */
function isSameCluster(currentClusters, nextClusters) {
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
/**
 * Get the center position of cluster
 * @param cluster
 * @param width dimension width
 * @param height dimension height
 * @param offset delta offset for the big markers
 */
function getCenterPosition(cluster, width, height, offset = 1.3) {
    const latitudes = cluster.userExtension.markers.map((m) => m.coordinate.latitude);
    const longitudes = cluster.userExtension.markers.map((m) => m.coordinate.longitude);
    const maxLatitude = Math.max.apply(null, latitudes.map((m) => Math.abs(m)));
    const maxLongitude = Math.max.apply(null, longitudes.map((m) => Math.abs(m)));
    const minLatitude = Math.min.apply(null, latitudes.map((m) => Math.abs(m)));
    const minLongitude = Math.min.apply(null, longitudes.map((m) => Math.abs(m)));
    const _boundingBox = [
        longitudes.find((l) => Math.abs(l) === minLongitude),
        latitudes.find((l) => Math.abs(l) === minLatitude),
        longitudes.find((l) => Math.abs(l) === maxLongitude),
        latitudes.find((l) => Math.abs(l) === maxLatitude),
    ];
    const _viewport = GeoViewport.viewport(_boundingBox, [width, height]);
    return {
        latitude: _viewport.center[1],
        longitude: _viewport.center[0],
        longitudeDelta: (maxLongitude - minLongitude) * offset || 0.1,
        latitudeDelta: (maxLatitude - minLatitude) * offset || 0.1,
    };
}
/**
 * Animate marker if the clusters changes
 * @param duration
 * @param originalMarkers
 * @param animatedMarkers
 * @param currentClusters
 * @param nextClusters
 */
function animateMarkersIfNeeded(duration, originalMarkers, animatedMarkers, currentClusters, nextClusters) {
    if (!isSameCluster(currentClusters, nextClusters)) {
        // release from cluster or move into cluster
        originalMarkers.forEach((marker, index) => {
            const stayCluster = nextClusters.find((cluster) => cluster.userExtension.markers.find((m) => m.id === marker.id));
            const coordinate = stayCluster
                ? stayCluster.userExtension.coordinate
                : marker.coordinate;
            animatedMarkers[index].coordinate // @ts-ignore
                .timing({ ...coordinate, duration })
                .start();
        });
    }
}
export const withAnimatedCluster = (options) => {
    return (WrappedComponent) => {
        return class extends React.Component {
            constructor(props) {
                super(props);
                this.state = {
                    animatedMarkers: [],
                    clusters: [],
                    region: props.initialRegion,
                };
                this.superCluster = options.superClusterProvider();
                this.onRegionChanged = this.onRegionChanged.bind(this);
            }
            componentDidMount() {
                this.initialize();
            }
            /**
             * Recreate marker and cluster if the marker changed
             *
             * @param prevProps
             */
            componentDidUpdate(prevProps) {
                const prevLen = prevProps.markers.length;
                const nextLen = this.props.markers.length;
                if (nextLen !== prevLen) {
                    this.initialize();
                    return;
                }
                const prev = prevProps.markers
                    .map((marker) => marker.id)
                    .join('_');
                const next = this.props.markers
                    .map((marker) => marker.id)
                    .join('_');
                if (prev !== next) {
                    this.initialize();
                }
            }
            /**
             * Render the wrapped component with additional props.
             */
            render() {
                return (React.createElement(WrappedComponent, { ...this.props, region: this.state.region, clusters: this.state.clusters, onRegionChanged: this.onRegionChanged, animatedMarkers: this.state.animatedMarkers }));
            }
            /**
             * Create the clusters and animated markers.
             * Trigger when the marker changes.
             */
            initialize() {
                const animatedMarkers = createAnimatedMarkers(this.props.markers);
                this.setState({ animatedMarkers }, () => {
                    const defaultClusters = this.props.markers.map((marker) => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [
                                marker.coordinate.longitude,
                                marker.coordinate.latitude,
                            ],
                        },
                        properties: {
                            point_count: 0,
                            item: marker,
                        },
                    }));
                    // @ts-ignore
                    this.superCluster.load(defaultClusters);
                    this.onRegionChanged(this.state.region);
                });
            }
            /**
             * Recreate the cluster by new Region.
             * Call on onRegionChangeCompleted
             *
             * @param region currentRegion
             */
            onRegionChanged(region) {
                const delta = region.longitudeDelta < 0
                    ? region.latitudeDelta + 360
                    : region.longitudeDelta;
                const boundingBox = [
                    region.longitude - delta,
                    region.latitude - region.latitudeDelta,
                    region.longitude + delta,
                    region.latitude + region.latitudeDelta,
                ];
                const viewport = region.longitudeDelta >= 40
                    ? { zoom: 1 }
                    : GeoViewport.viewport(boundingBox, [options.width, options.height]);
                // @ts-ignore
                const clusters = this.superCluster.getClusters(boundingBox, viewport.zoom);
                const originalMarkers = this.props.markers;
                clusters.forEach((cluster) => {
                    if (cluster.properties.point_count === 0) {
                        const marker = originalMarkers.find((m) => m.id === cluster.properties.item.id);
                        cluster.userExtension = {
                            coordinate: cluster.properties.item.coordinate,
                            markers: marker ? [marker] : [],
                            getCenterPosition: () => getCenterPosition(cluster, options.width, options.height, options.deltaOffset),
                        };
                    }
                    else {
                        const markers = [];
                        // add markers of child clusters
                        this.superCluster
                            .getChildren(cluster.properties.cluster_id) // @ts-ignore
                            .forEach((child) => {
                            this.addMarkersToTopCluster(originalMarkers, child, markers);
                        });
                        cluster.userExtension = {
                            coordinate: {
                                latitude: cluster.geometry.coordinates[1],
                                longitude: cluster.geometry.coordinates[0],
                            },
                            markers,
                            getCenterPosition: () => getCenterPosition(cluster, options.width, options.height, options.deltaOffset),
                        };
                    }
                });
                animateMarkersIfNeeded(options.moveSpeed, originalMarkers, this.state.animatedMarkers, this.state.clusters, clusters);
                this.setState({ region, clusters });
            }
            /**
             * Add the markers to the top level cluster.
             * @param originalMarkers
             * @param cluster
             * @param markers
             */
            addMarkersToTopCluster(originalMarkers, cluster, markers) {
                if (cluster.properties.point_count === 0) {
                    const id = cluster.properties.item.id;
                    const marker = originalMarkers.find((m) => m.id === id);
                    if (marker) {
                        markers.push(marker);
                    }
                }
                else {
                    this.superCluster
                        .getChildren(cluster.properties.cluster_id) // @ts-ignore
                        .forEach((child) => {
                        this.addMarkersToTopCluster(originalMarkers, child, markers);
                    });
                }
            }
        };
    };
};
//# sourceMappingURL=index.js.map