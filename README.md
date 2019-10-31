# react-native-map-cluster

[cmapper](https://apps.apple.com/jp/app/cmapper/id935586290) or [8xplorer](https://apps.apple.com/app/apple-store/id1460433285?mt=8&l=ja) like smooth map clustering library

![demo](/image/anim.gif)

## Installation

1. install dependency
```
yarn add react-native-maps
yarn add supercluster
yarn add @mapbox/geo-viewport
```

2. install library

```
yarn add react-native-map-cluster
```

## Usage

see [Example](/example/sampleProject)

```
const {width, height} = Dimensions.get('window');
const Component = withAnimatedCluster({
  moveSpeed: 600,
  deltaOffset: 1.3,
  width,
  height,
  superClusterProvider: () =>new Supercluster(),
})(class Map extends React.Component<Props, State> {

  // render markers 
  public renderMarker(marker: AnimatedMarker & any, index: number) {
      const {clusters, region} = this.props;
      
      // get the cluster which the marker in.
      const currentCluster = marker.getCluster(clusters);
      
      // marker count in same cluster.
      // marker is not clustered if the currentCluster is undefined.
      const markersInClusterCount = currentCluster? currentCluster.properties.point_count: 0;
      
      return (
        <MarkerAnimated
          key={marker.id}
          coordinate={marker.coordinate}
          
          // zoom into pressed cluster
          onPress={() => markersInClusterCount && this.map.animateToRegion.currentCluster!!.userExtension.getCenterPosition())}>
          <View style={styles.marker}>
            {markersInClusterCount ? (
              <View style={styles.point}>
                <Text style={styles.pointText}>{markersInClusterCount}</Text>
              </View>
            ) : null}
            <Image source={{uri: marker.image}} style={[styles.markerImage]} />
          </View>
        </MarkerAnimated>
      );
    }

  // render map 
  public render() {
      const {animatedMarkers, region, onRegionChanged} = this.props;
      return (
        <MapView 
          // recreate cluster when the region changes
          onRegionChangeComplete={onRegionChanged}
          initialRegion={region}
          style={styles.map}>
          {animatedMarkers.map(this.renderMarker)}
        </MapView>
      );
    }
} 
```


