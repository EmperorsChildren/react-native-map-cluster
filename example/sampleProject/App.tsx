/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, { Fragment } from 'react';
import {
  SafeAreaView,
  View,
  Dimensions,
  StatusBar,
  Image,
  Text, StyleSheet
} from 'react-native';

import MapView, { MarkerAnimated } from "react-native-maps";
import Supercluster from 'supercluster';
import { withAnimatedCluster, InjectedProps, AnimatedMarker, OriginalProps } from "react-native-map-cluster";

const {width, height} = Dimensions.get('window');

const markers = [
  {id: 1, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0798_Thepalacemuseum_1_square_thumbnail750.jpg', coordinate: {latitude:43.4930773, longitude: 142.6135468}},
  {id: 2, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0147_KurashikiBikan_1_square_thumbnail750.jpg', coordinate: {latitude: 34.5954389, longitude: 133.77166850}},
  {id: 3, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0157_OshinoHakkai_1_square_thumbnail750.jpg', coordinate: {latitude: 32.5555555, longitude: 133.7716685}},
  {id: 4, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0139_KikuchiGorge_1_square_thumbnail750.jpg', coordinate: {latitude: 27.0377568, longitude: 128.43315590}},
  {id: 5, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0149_Kasuga-taisha_1_square_thumbnail750.jpg', coordinate: {latitude: 36.7377173, longitude: 131.50196120}},
  {id: 6, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0114_YokoteIgloo_1_square_thumbnail750.jpg', coordinate: {latitude: 36.4201741, longitude: 132.79052280}},
  {id: 7, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0711_Lhasa_1_square_thumbnail750.jpg', coordinate: {latitude: 32.5159198, longitude: 128.2091132}},
  {id: 8, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0246_ArakurayamaFuji_1_square_thumbnail750.jpg', coordinate: {latitude: 33.5193106, longitude: 129.1268965}},
  {id: 9, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0042_Hashikuiiwa_1_square_thumbnail750.jpg', coordinate: {latitude: 35.0016954, longitude: 128.835277}},
  {id: 10, image: 'https://d3scqakcx07ymv.cloudfront.net/011Spot_0117_SnowCorridor_1_square_thumbnail750.jpg', coordinate: {latitude: 39.4035111, longitude: 132.17433460}},
];

type State = {
  selectedIndex: number;
}

type Props = InjectedProps & OriginalProps

const Component = withAnimatedCluster({
  moveSpeed: 600,
  deltaOffset: 1.3,
  width,
  height,
  superClusterProvider: () => new Supercluster<Supercluster.AnyProps, Supercluster.AnyProps>()
})(class Map extends React.Component<Props,State> {

  private map?: MapView;

  constructor(props:any) {
    super(props);
    this.state = {
      selectedIndex: 0
    }
    this.renderMarker = this.renderMarker.bind(this) ;
  }

  renderMarker(marker: AnimatedMarker, index: number) {
    const {clusters, region} = this.props;

    const currentCluster = marker.getCluster(clusters);
    const markersInClusterCount = currentCluster ? currentCluster.properties.point_count : 0;

    const zIndexStyle = {
      zIndex: index
    };

    const onPress = () => {
      if(markersInClusterCount) {
        this.map!!.animateToRegion(currentCluster.userExtension.getCenterPosition());
      }else {
        this.map!!.animateToRegion({
          latitude: marker.coordinate.latitude._value,
          longitude: marker.coordinate.longitude._value,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        });

      }
    };

    return (<MarkerAnimated key={marker.id} coordinate={marker.coordinate} style={zIndexStyle} onPress={onPress}>
        <View style={styles.marker}>
          { markersInClusterCount ? <View style={styles.point}><Text style={styles.pointText}>{markersInClusterCount}</Text></View> : null}
          <Image source={{uri: marker.image}} style={[styles.markerImage]}/>
        </View>
      </MarkerAnimated>
    )
  }

  render() {
    const { animatedMarkers, region, onRegionChanged } = this.props;
    return (
      <MapView ref={(ref: MapView) => this.map = ref} onRegionChangeComplete={onRegionChanged} initialRegion={region} style={styles.map}>
        {animatedMarkers.map(this.renderMarker)}
      </MapView>
    );
  }
})

const App = () => {
  return (
    <Fragment>
      <StatusBar barStyle="dark-content"/>
      <SafeAreaView style={{flex:1}}>
        <Component markers={markers} initialRegion={{...markers[0].coordinate, latitudeDelta: 0 , longitudeDelta: 0}}/>
      </SafeAreaView>
    </Fragment>
  );
};

const styles = StyleSheet.create({
  map: {
    flex:1
  },
  point: {
    zIndex: 1,
    top: 2,
    right: 2,
    position: "absolute",
    borderRadius: 20,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'red',
  },
  pointText: {
    fontSize: 11,
    color: "white"
  },
  marker: {
    backgroundColor: "white",
    padding: 5,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  markerImage: {
    width: 64,
    height: 64,
    padding: 10,
    borderRadius: 32
  }
})

export default App;
