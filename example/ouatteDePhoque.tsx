/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, { Fragment, useRef } from 'react'
import {
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'

// import {
//   AnimatedClusterFunc,
//   AnimatedMarker,
//   InjectedProps,
//   OriginalProps,
//   withAnimatedCluster,
// } from "@emperorschildren/react-native-map-cluster";
import MapView, { MarkerAnimated } from 'react-native-maps'
import Supercluster from 'supercluster'
import {
  AnimatedClusterFunc,
  AnimatedMarker,
  InjectedProps,
  OriginalProps,
  withAnimatedCluster,
} from './Yoshidan'

const { width, height } = Dimensions.get('window')

export const YoshidanMarkers = [
  {
    id: 1,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0798_Thepalacemuseum_1_square_thumbnail750.jpg',
    coordinate: { latitude: 43.4930773, longitude: 142.6135468 },
  },
  {
    id: 2,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0147_KurashikiBikan_1_square_thumbnail750.jpg',
    coordinate: { latitude: 34.5954389, longitude: 133.7716685 },
  },
  {
    id: 3,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0157_OshinoHakkai_1_square_thumbnail750.jpg',
    coordinate: { latitude: 32.5555555, longitude: 133.7716685 },
  },
  {
    id: 4,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0139_KikuchiGorge_1_square_thumbnail750.jpg',
    coordinate: { latitude: 27.0377568, longitude: 128.4331559 },
  },
  {
    id: 5,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0149_Kasuga-taisha_1_square_thumbnail750.jpg',
    coordinate: { latitude: 36.7377173, longitude: 131.5019612 },
  },
  {
    id: 6,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0114_YokoteIgloo_1_square_thumbnail750.jpg',
    coordinate: { latitude: 36.4201741, longitude: 132.7905228 },
  },
  {
    id: 7,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0711_Lhasa_1_square_thumbnail750.jpg',
    coordinate: { latitude: 32.5159198, longitude: 128.2091132 },
  },
  {
    id: 8,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0246_ArakurayamaFuji_1_square_thumbnail750.jpg',
    coordinate: { latitude: 33.5193106, longitude: 129.1268965 },
  },
  {
    id: 9,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0042_Hashikuiiwa_1_square_thumbnail750.jpg',
    coordinate: { latitude: 35.0016954, longitude: 128.835277 },
  },
  {
    id: 10,
    image:
      'https://d3scqakcx07ymv.cloudfront.net/011Spot_0117_SnowCorridor_1_square_thumbnail750.jpg',
    coordinate: { latitude: 39.4035111, longitude: 132.1743346 },
  },
]

interface State {
  selectedIndex: number
}

type Props = InjectedProps & OriginalProps

export const YoshidanMap = withAnimatedCluster({
  moveSpeed: 600,
  deltaOffset: 1.3,
  width,
  height,
  superClusterProvider: () =>
    new Supercluster<Supercluster.AnyProps, Supercluster.AnyProps>(),
})(
  class Map extends React.Component<Props, State> {
    private map?: MapView

    constructor(props: any) {
      super(props)
      this.state = {
        selectedIndex: 0,
      }
      this.renderMarker = this.renderMarker.bind(this)
    }

    public renderMarker(marker: AnimatedMarker & any, index: number) {
      const { clusters, region } = this.props

      const currentCluster = marker.getCluster(clusters)
      const markersInClusterCount = currentCluster
        ? currentCluster.properties.point_count
        : 0

      const zIndexStyle = {
        zIndex: index,
      }

      const onPress = () => {
        if (markersInClusterCount) {
          this.map!!.animateToRegion(
            currentCluster!!.userExtension.getCenterPosition(),
          )
        } else {
          this.map!!.animateToRegion({
            // @ts-ignore
            latitude: marker.coordinate.latitude._value,
            // @ts-ignore
            longitude: marker.coordinate.longitude._value,
            latitudeDelta: region.latitudeDelta,
            longitudeDelta: region.longitudeDelta,
          })
        }
      }

      return (
        <MarkerAnimated
          key={marker.id}
          coordinate={marker.coordinate}
          style={zIndexStyle}
          onPress={onPress}
        >
          <View style={styles.marker}>
            {markersInClusterCount ? (
              <View style={styles.point}>
                <Text style={styles.pointText}>{markersInClusterCount}</Text>
              </View>
            ) : null}
            <Image
              source={{ uri: marker.image }}
              style={[styles.markerImage]}
            />
          </View>
        </MarkerAnimated>
      )
    }

    public render() {
      const { initialRegion } = this.props
      const { animatedMarkers, onRegionChanged } = this.props
      return (
        <MapView
          ref={(ref: MapView) => (this.map = ref)}
          onRegionChangeComplete={onRegionChanged}
          initialRegion={initialRegion}
          style={styles.map}
        >
          {animatedMarkers.map(this.renderMarker)}
        </MapView>
      )
    }
  },
)

function WrappedComponent(props: Props) {
  const mapRef = useRef<MapView>()

  const { initialRegion } = props
  const { animatedMarkers, onRegionChanged } = props

  function renderMarker(marker: AnimatedMarker & any, index: number) {
    const { clusters, region } = props

    const currentCluster = marker.getCluster(clusters)
    const markersInClusterCount = currentCluster
      ? currentCluster.properties.point_count
      : 0

    const zIndexStyle = {
      zIndex: index,
    }

    const onPress = () => {
      if (markersInClusterCount) {
        mapRef.current!!.animateToRegion(
          currentCluster!!.userExtension.getCenterPosition(),
        )
      } else {
        mapRef.current!!.animateToRegion({
          latitude: marker.coordinate.latitude._value,
          longitude: marker.coordinate.longitude._value,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        })
      }
    }

    return (
      <MarkerAnimated
        key={marker.id}
        coordinate={marker.coordinate}
        style={zIndexStyle}
        onPress={onPress}
      >
        <View style={styles.marker}>
          {markersInClusterCount ? (
            <View style={styles.point}>
              <Text style={styles.pointText}>{markersInClusterCount}</Text>
            </View>
          ) : null}
          <Image source={{ uri: marker.image }} style={[styles.markerImage]} />
        </View>
      </MarkerAnimated>
    )
  }

  return (
    <MapView
      ref={(ref: MapView) => (mapRef.current = ref)}
      onRegionChangeComplete={onRegionChanged}
      initialRegion={initialRegion}
      style={styles.map}
    >
      {animatedMarkers.map(renderMarker)}
    </MapView>
  )
}

export function YoshidanMapAlt(props: OriginalProps) {
  return (
    <AnimatedClusterFunc
      options={{
        moveSpeed: 600,
        deltaOffset: 1.3,
        width,
        height,
        superClusterProvider: () =>
          new Supercluster<Supercluster.AnyProps, Supercluster.AnyProps>(),
      }}
      WrappedComponent={WrappedComponent}
      props={props}
    />
  )
}

const Swag = () => {
  return (
    <Fragment>
      <StatusBar barStyle='dark-content' />
      <SafeAreaView style={{ flex: 1 }}>
        <YoshidanMap
          markers={YoshidanMarkers}
          initialRegion={{
            ...YoshidanMarkers[0].coordinate,
            latitudeDelta: 10,
            longitudeDelta: 10,
          }}
        />

        <YoshidanMapAlt
          markers={YoshidanMarkers}
          initialRegion={{
            ...YoshidanMarkers[0].coordinate,
            latitudeDelta: 10,
            longitudeDelta: 10,
          }}
        />
      </SafeAreaView>
    </Fragment>
  )
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  point: {
    zIndex: 1,
    top: 2,
    right: 2,
    position: 'absolute',
    borderRadius: 20,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'red',
  },
  pointText: {
    fontSize: 11,
    color: 'white',
  },
  marker: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 64,
    height: 64,
    padding: 10,
    borderRadius: 32,
  },
})
