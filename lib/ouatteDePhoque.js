//@ts-ignore
import GeoViewport from '@placemarkio/geo-viewport';
import React, { useEffect, useRef, useState } from 'react';
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
function animateMarkersIfNeeded({ duration, originalMarkers, animatedMarkers, currentClusters, nextClusters, }) {
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
// interface T extends OriginalProps {}
export function AnimatedClusterFunc({ options, WrappedComponent, props, }) {
    const emptyArray = [];
    const prevMarkers = useRef(emptyArray);
    const [stateAnimatedMarkers, setAnimatedMarkers] = useState(emptyArray);
    const [stateClusters, setClusters] = useState(emptyArray);
    const [stateRegion, setRegion] = useState(props.initialRegion);
    const superCluster = options.superClusterProvider();
    useEffect(() => {
        initialize();
    }, []);
    //   useEffect(() => {
    //     const prevLen = prevMarkers.current.length;
    //     const nextLen = props.markers.length;
    //     if (nextLen !== prevLen) {
    //       initialize();
    //       return;
    //     }
    //     const prev = prevMarkers.current
    //       .map((marker: Marker) => marker.id)
    //       .join("_");
    //     const next = props.markers.map((marker: Marker) => marker.id).join("_");
    //     if (prev !== next) {
    //       initialize();
    //     }
    //   });
    useEffect(() => {
        const defaultClusters = props.markers.map((marker) => ({
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
        // @ts-ignore
        superCluster.load(defaultClusters);
        // const [points, supercluster] = useClusterer(
        //     defaultClusters,
        //     {width: options.width, height: options.height},
        //     stateRegion
        //   );
        // onRegionChanged(stateRegion);
    }, [stateAnimatedMarkers]);
    /**
     * Create the clusters and animated markers.
     * Trigger when the marker changes.
     */
    function initialize() {
        const animatedMarkers = createAnimatedMarkers(props.markers);
        setAnimatedMarkers(animatedMarkers);
        prevMarkers.current = props.markers;
    }
    /**
     * Recreate the cluster by new Region.
     * Call on onRegionChangeCompleted
     *
     * @param region currentRegion
     */
    function onRegionChanged(region) {
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
        const superClusters = superCluster.getClusters(boundingBox, viewport.zoom);
        // const bBox = calculateBBox(region);
        // const zoom = returnMapZoom(
        //   region,
        //   bBox,
        //   1, //minZoom!,
        //   options.width,
        //   options.height,
        // );
        // const superClusters = superCluster.getClusters(bBox, zoom);
        const originalMarkers = props.markers;
        const clusters = superClusters.map((x) => {
            if (x.properties.point_count === 0) {
                const marker = originalMarkers.find((m) => m.id === x.properties.item.id);
                const cluster = {
                    properties: {
                        item: x.properties.item,
                        cluster_id: x.properties.cluster_id,
                        point_count: x.properties.point_count,
                    },
                    geometry: x.geometry,
                    userExtension: {
                        coordinate: x.properties.item.coordinate,
                        markers: marker ? [marker] : [],
                        getCenterPosition: () => {
                            const fakeRegion = {
                                latitude: 0,
                                longitude: 0,
                                latitudeDelta: 0,
                                longitudeDelta: 0,
                            };
                            return fakeRegion;
                        },
                    },
                };
                cluster.userExtension = {
                    ...cluster.userExtension,
                    getCenterPosition: () => getCenterPosition(cluster, options.width, options.height, options.deltaOffset),
                };
                return cluster;
            }
            else {
                const markers = [];
                // add markers of child clusters
                // superCluster
                //   .getChildren(x.properties.cluster_id)
                //   .forEach((child: Cluster) => {
                //     addMarkersToTopCluster(originalMarkers, child, markers);
                //   });
                const cluster = {
                    properties: {
                        item: x.properties.item,
                        cluster_id: x.properties.cluster_id,
                        point_count: x.properties.point_count,
                    },
                    geometry: x.geometry,
                    userExtension: {
                        coordinate: {
                            latitude: x.geometry.coordinates[1],
                            longitude: x.geometry.coordinates[0],
                        },
                        markers: markers,
                        getCenterPosition: () => {
                            const fakeRegion = {
                                latitude: 0,
                                longitude: 0,
                                latitudeDelta: 0,
                                longitudeDelta: 0,
                            };
                            return fakeRegion;
                        },
                    },
                };
                cluster.userExtension = {
                    ...cluster.userExtension,
                    getCenterPosition: () => getCenterPosition(cluster, options.width, options.height, options.deltaOffset),
                };
                return cluster;
            }
        });
        // animateMarkersIfNeeded({
        //   duration: options.moveSpeed,
        //   originalMarkers,
        //   animatedMarkers: stateAnimatedMarkers,
        //   currentClusters: stateClusters,
        //   nextClusters: clusters,
        // });
        setRegion(region);
        setClusters(clusters);
    }
    /**
     * Add the markers to the top level cluster.
     * @param originalMarkers
     * @param cluster
     * @param markers
     */
    function addMarkersToTopCluster(originalMarkers, cluster, markers) {
        if (cluster.properties.point_count === 0) {
            const id = cluster.properties.item.id;
            const marker = originalMarkers.find((m) => m.id === id);
            if (marker) {
                markers.push(marker);
            }
        }
        else {
            superCluster
                .getChildren(cluster.properties.cluster_id) // @ts-ignore
                .forEach((child) => {
                addMarkersToTopCluster(originalMarkers, child, markers);
            });
        }
    }
    /**
     * Render the wrapped component with additional props.
     */
    return (React.createElement(WrappedComponent, { ...props, region: stateRegion, clusters: stateClusters, onRegionChanged: onRegionChanged, animatedMarkers: stateAnimatedMarkers }));
}
const calculateBBox = (region) => {
    let lngD;
    if (region.longitudeDelta < 0)
        lngD = region.longitudeDelta + 360;
    else
        lngD = region.longitudeDelta;
    return [
        region.longitude - lngD,
        region.latitude - region.latitudeDelta,
        region.longitude + lngD,
        region.latitude + region.latitudeDelta, // northLat - max lat
    ];
};
const returnMapZoom = (region, bBox, minZoom, width, height) => {
    const viewport = region.longitudeDelta >= 40
        ? { zoom: minZoom }
        : GeoViewport.viewport(bBox, [width, height]);
    return viewport.zoom;
};
//# sourceMappingURL=ouatteDePhoque.js.map