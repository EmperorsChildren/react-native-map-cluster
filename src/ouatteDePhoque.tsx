//@ts-ignore
import GeoViewport from '@placemarkio/geo-viewport'
import React, { useEffect, useRef, useState } from 'react'
import { AnimatedRegion, Region } from 'react-native-maps'
import Supercluster from 'supercluster'

export interface Cluster {
  properties: {
    item: Marker
    cluster_id: any
    point_count: number
  }
  geometry?: any
  userExtension: {
    coordinate: {
      latitude: number
      longitude: number
    }
    markers: Marker[]
    getCenterPosition: () => Region
  }
}

interface Marker {
  coordinate: Region
  id: number | string
}

type AnyMarker = Marker & any

export interface AnimatedMarker {
  coordinate: AnimatedRegion
  id: number | string
  getCluster: (clusters: Cluster[]) => Cluster | undefined
}

export interface InjectedProps {
  region: Region
  clusters: Cluster[]
  onRegionChanged: (region: Region) => void
  animatedMarkers: AnimatedMarker[]
}

export interface OriginalProps {
  markers: AnyMarker[]
  initialRegion: Region
}

interface State {
  animatedMarkers: AnimatedMarker[]
  clusters: Cluster[]
  region: Region
}

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
      latitudeDelta:
        marker.coordinate.latitudeDelta === undefined
          ? 0
          : marker.coordinate.latitudeDelta,
      longitudeDelta:
        marker.coordinate.longitudeDelta === undefined
          ? 0
          : marker.coordinate.longitudeDelta,
    }),
    id: marker.id,
    getCluster: (clusters: Cluster[]) => {
      return clusters.find((cluster: Cluster) =>
        (cluster.userExtension.markers || []).find((m) => m.id === marker.id),
      )
    },
  }))
}

/**
 * test if the clusters are same
 * @param currentClusters
 * @param nextClusters
 */
function isSameCluster(
  currentClusters: Cluster[],
  nextClusters: Cluster[],
): boolean {
  if (currentClusters.length !== nextClusters.length) {
    return false
  }
  for (let i = 0; i < currentClusters.length; i++) {
    const currentCoordinate = currentClusters[i].userExtension.coordinate
    const nextCoordinate = nextClusters[i].userExtension.coordinate
    if (currentCoordinate.latitude !== nextCoordinate.latitude) {
      return false
    }
    if (currentCoordinate.longitude !== nextCoordinate.longitude) {
      return false
    }
  }
  return true
}

/**
 * Get the center position of cluster
 * @param cluster
 * @param width dimension width
 * @param height dimension height
 * @param offset delta offset for the big markers
 */
function getCenterPosition(
  cluster: Cluster,
  width: number,
  height: number,
  offset: number = 1.3,
): Region {
  const latitudes = cluster.userExtension.markers.map(
    (m: Marker) => m.coordinate.latitude,
  )
  const longitudes = cluster.userExtension.markers.map(
    (m: Marker) => m.coordinate.longitude,
  )
  const maxLatitude = Math.max.apply(
    null,
    latitudes.map((m) => Math.abs(m)),
  )
  const maxLongitude = Math.max.apply(
    null,
    longitudes.map((m) => Math.abs(m)),
  )
  const minLatitude = Math.min.apply(
    null,
    latitudes.map((m) => Math.abs(m)),
  )
  const minLongitude = Math.min.apply(
    null,
    longitudes.map((m) => Math.abs(m)),
  )
  const _boundingBox: [number, number, number, number] = [
    longitudes.find((l) => Math.abs(l) === minLongitude)!!,
    latitudes.find((l) => Math.abs(l) === minLatitude)!!,
    longitudes.find((l) => Math.abs(l) === maxLongitude)!!,
    latitudes.find((l) => Math.abs(l) === maxLatitude)!!,
  ]
  const _viewport = GeoViewport.viewport(_boundingBox, [width, height])
  return {
    latitude: _viewport.center[1],
    longitude: _viewport.center[0],
    longitudeDelta: (maxLongitude - minLongitude) * offset || 0.1,
    latitudeDelta: (maxLatitude - minLatitude) * offset || 0.1,
  }
}

/**
 * Animate marker if the clusters changes
 * @param duration
 * @param originalMarkers
 * @param animatedMarkers
 * @param currentClusters
 * @param nextClusters
 */
function animateMarkersIfNeeded({
  duration,
  originalMarkers,
  animatedMarkers,
  currentClusters,
  nextClusters,
}: {
  duration: number
  originalMarkers: Marker[]
  animatedMarkers: AnimatedMarker[]
  currentClusters: Cluster[]
  nextClusters: Cluster[]
}) {
  if (!isSameCluster(currentClusters, nextClusters)) {
    // release from cluster or move into cluster
    originalMarkers.forEach((marker: Marker, index: number) => {
      const stayCluster = nextClusters.find((cluster: Cluster) =>
        cluster.userExtension.markers.find((m) => m.id === marker.id),
      )
      const coordinate = stayCluster
        ? stayCluster.userExtension.coordinate
        : marker.coordinate

      animatedMarkers[index].coordinate // @ts-ignore
        .timing({ ...coordinate, duration })
        .start()
    })
  }
}

// interface T extends OriginalProps {}

export function AnimatedClusterFunc({
  options,
  WrappedComponent,
  props,
}: {
  options: {
    width: number
    height: number
    deltaOffset: 1.3
    superClusterProvider: () => Supercluster
    moveSpeed: 600
  }
  WrappedComponent: React.ComponentType<OriginalProps & InjectedProps>
  props: OriginalProps
  // WrappedComponent: React.ComponentType<T & InjectedProps>
  // props: T
}) {
  const emptyArray: [] = []

  const prevMarkers = useRef<any[]>(emptyArray)

  const [stateAnimatedMarkers, setAnimatedMarkers] =
    useState<AnimatedMarker[]>(emptyArray)
  const [stateClusters, setClusters] = useState<Cluster[]>(emptyArray)
  const [stateRegion, setRegion] = useState<Region>(props.initialRegion)

  const superCluster: Supercluster = options.superClusterProvider()

  useEffect(() => {
    initialize()
  }, [])

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
    const defaultClusters = props.markers.map((marker: Marker) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [marker.coordinate.longitude, marker.coordinate.latitude],
      },
      properties: {
        point_count: 0,
        item: marker,
      },
    }))

    // @ts-ignore
    superCluster.load(defaultClusters)

    // const [points, supercluster] = useClusterer(
    //     defaultClusters,
    //     {width: options.width, height: options.height},
    //     stateRegion
    //   );

    // onRegionChanged(stateRegion);
  }, [stateAnimatedMarkers])

  /**
   * Create the clusters and animated markers.
   * Trigger when the marker changes.
   */
  function initialize() {
    const animatedMarkers = createAnimatedMarkers(props.markers)
    setAnimatedMarkers(animatedMarkers)
    prevMarkers.current = props.markers
  }

  /**
   * Recreate the cluster by new Region.
   * Call on onRegionChangeCompleted
   *
   * @param region currentRegion
   */
  function onRegionChanged(region: Region) {
    const delta =
      region.longitudeDelta < 0
        ? region.latitudeDelta + 360
        : region.longitudeDelta
    const boundingBox: [number, number, number, number] = [
      region.longitude - delta,
      region.latitude - region.latitudeDelta,
      region.longitude + delta,
      region.latitude + region.latitudeDelta,
    ]
    const viewport =
      region.longitudeDelta >= 40
        ? { zoom: 1 }
        : GeoViewport.viewport(boundingBox, [options.width, options.height])

    const superClusters = superCluster.getClusters(boundingBox, viewport.zoom)

    // const bBox = calculateBBox(region);
    // const zoom = returnMapZoom(
    //   region,
    //   bBox,
    //   1, //minZoom!,
    //   options.width,
    //   options.height,
    // );

    // const superClusters = superCluster.getClusters(bBox, zoom);

    const originalMarkers = props.markers
    const clusters = superClusters.map((x) => {
      if (x.properties.point_count === 0) {
        const marker = originalMarkers.find(
          (m: Marker) => m.id === x.properties.item.id,
        )

        const cluster: Cluster = {
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
              const fakeRegion: Region = {
                latitude: 0,
                longitude: 0,
                latitudeDelta: 0,
                longitudeDelta: 0,
              }
              return fakeRegion
            },
          },
        }

        cluster.userExtension = {
          ...cluster.userExtension,
          getCenterPosition: () =>
            getCenterPosition(
              cluster,
              options.width,
              options.height,
              options.deltaOffset,
            ),
        }

        return cluster
      } else {
        const markers: Marker[] = []
        // add markers of child clusters

        // superCluster
        //   .getChildren(x.properties.cluster_id)
        //   .forEach((child: Cluster) => {
        //     addMarkersToTopCluster(originalMarkers, child, markers);
        //   });

        const cluster: Cluster = {
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
              const fakeRegion: Region = {
                latitude: 0,
                longitude: 0,
                latitudeDelta: 0,
                longitudeDelta: 0,
              }
              return fakeRegion
            },
          },
        }

        cluster.userExtension = {
          ...cluster.userExtension,
          getCenterPosition: () =>
            getCenterPosition(
              cluster,
              options.width,
              options.height,
              options.deltaOffset,
            ),
        }

        return cluster
      }
    })

    // animateMarkersIfNeeded({
    //   duration: options.moveSpeed,
    //   originalMarkers,
    //   animatedMarkers: stateAnimatedMarkers,
    //   currentClusters: stateClusters,
    //   nextClusters: clusters,
    // });

    setRegion(region)
    setClusters(clusters)
  }

  /**
   * Add the markers to the top level cluster.
   * @param originalMarkers
   * @param cluster
   * @param markers
   */
  function addMarkersToTopCluster(
    originalMarkers: Marker[],
    cluster: Cluster,
    markers: Marker[],
  ) {
    if (cluster.properties.point_count === 0) {
      const id = cluster.properties.item.id
      const marker = originalMarkers.find((m: Marker) => m.id === id)
      if (marker) {
        markers.push(marker)
      }
    } else {
      superCluster
        .getChildren(cluster.properties.cluster_id) // @ts-ignore
        .forEach((child: Cluster) => {
          addMarkersToTopCluster(originalMarkers, child, markers)
        })
    }
  }

  /**
   * Render the wrapped component with additional props.
   */
  return (
    <WrappedComponent
      {...props}
      region={stateRegion}
      clusters={stateClusters}
      onRegionChanged={onRegionChanged}
      animatedMarkers={stateAnimatedMarkers}
    />
  )
}

const calculateBBox = (region: Region | AnimatedRegion): GeoViewport.Bounds => {
  let lngD: number
  if (region.longitudeDelta < 0) lngD = region.longitudeDelta + 360
  else lngD = region.longitudeDelta

  return [
    region.longitude - lngD, // westLng - min lng
    region.latitude - region.latitudeDelta, // southLat - min lat
    region.longitude + lngD, // eastLng - max lng
    region.latitude + region.latitudeDelta, // northLat - max lat
  ]
}

const returnMapZoom = (
  region: Region | AnimatedRegion,
  bBox: GeoViewport.Bounds,
  minZoom: number,
  width: number,
  height: number,
) => {
  const viewport =
    region.longitudeDelta >= 40
      ? { zoom: minZoom }
      : GeoViewport.viewport(bBox, [width, height])

  return viewport.zoom
}
