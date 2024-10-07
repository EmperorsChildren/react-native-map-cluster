import GeoViewport from '@placemarkio/geo-viewport'
import * as React from 'react'
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
function animateMarkersIfNeeded(
  duration: number,
  originalMarkers: Marker[],
  animatedMarkers: AnimatedMarker[],
  currentClusters: Cluster[],
  nextClusters: Cluster[],
) {
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

export const withAnimatedCluster = (options: {
  width: number
  height: number
  deltaOffset: 1.3
  superClusterProvider: () => Supercluster
  moveSpeed: 600
}) => {
  return <T extends OriginalProps>(
    WrappedComponent: React.ComponentType<T & InjectedProps>,
  ): React.ComponentType<T> => {
    return class extends React.Component<T, State> {
      private readonly superCluster: Supercluster

      constructor(props: T) {
        super(props)
        this.state = {
          animatedMarkers: [],
          clusters: [],
          region: props.initialRegion,
        }
        this.superCluster = options.superClusterProvider()

        this.onRegionChanged = this.onRegionChanged.bind(this)
      }

      public componentDidMount() {
        this.initialize()
      }

      /**
       * Recreate marker and cluster if the marker changed
       *
       * @param prevProps
       */
      public componentDidUpdate(prevProps: T) {
        const prevLen = prevProps.markers.length
        const nextLen = this.props.markers.length
        if (nextLen !== prevLen) {
          this.initialize()
          return
        }
        const prev = prevProps.markers
          .map((marker: Marker) => marker.id)
          .join('_')
        const next = this.props.markers
          .map((marker: Marker) => marker.id)
          .join('_')
        if (prev !== next) {
          this.initialize()
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
        )
      }

      /**
       * Create the clusters and animated markers.
       * Trigger when the marker changes.
       */
      private initialize() {
        const animatedMarkers = createAnimatedMarkers(this.props.markers)

        this.setState({ animatedMarkers }, () => {
          const defaultClusters = this.props.markers.map((marker: Marker) => ({
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
          }))

          // @ts-ignore
          this.superCluster.load(defaultClusters)

          this.onRegionChanged(this.state.region)
        })
      }

      /**
       * Recreate the cluster by new Region.
       * Call on onRegionChangeCompleted
       *
       * @param region currentRegion
       */
      private onRegionChanged(region: Region) {
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

        // @ts-ignore
        const clusters = this.superCluster.getClusters(
          boundingBox,
          viewport.zoom,
        ) as Cluster[]

        const originalMarkers = this.props.markers
        clusters.forEach((cluster: Cluster) => {
          if (cluster.properties.point_count === 0) {
            const marker = originalMarkers.find(
              (m: Marker) => m.id === cluster.properties.item.id,
            )
            cluster.userExtension = {
              coordinate: cluster.properties.item.coordinate,
              markers: marker ? [marker] : [],
              getCenterPosition: () =>
                getCenterPosition(
                  cluster,
                  options.width,
                  options.height,
                  options.deltaOffset,
                ),
            }
          } else {
            const markers: Marker[] = []
            // add markers of child clusters

            this.superCluster
              .getChildren(cluster.properties.cluster_id) // @ts-ignore
              .forEach((child: Cluster) => {
                this.addMarkersToTopCluster(originalMarkers, child, markers)
              })

            cluster.userExtension = {
              coordinate: {
                latitude: cluster.geometry.coordinates[1],
                longitude: cluster.geometry.coordinates[0],
              },
              markers,
              getCenterPosition: () =>
                getCenterPosition(
                  cluster,
                  options.width,
                  options.height,
                  options.deltaOffset,
                ),
            }
          }
        })

        animateMarkersIfNeeded(
          options.moveSpeed,
          originalMarkers,
          this.state.animatedMarkers,
          this.state.clusters,
          clusters,
        )

        this.setState({ region, clusters })
      }

      /**
       * Add the markers to the top level cluster.
       * @param originalMarkers
       * @param cluster
       * @param markers
       */
      private addMarkersToTopCluster(
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
          this.superCluster
            .getChildren(cluster.properties.cluster_id) // @ts-ignore
            .forEach((child: Cluster) => {
              this.addMarkersToTopCluster(originalMarkers, child, markers)
            })
        }
      }
    }
  }
}
