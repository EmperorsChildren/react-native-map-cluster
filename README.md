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

Complete examples is [Here](/example/sampleProject/App.tsx)

There are only keypoint in this README.

* use `withAnimatedCluster`
* use `onRegionChanged` for MapView#onRegionChangeComplete

```
const {width, height} = Dimensions.get('window');
const Component = withAnimatedCluster({
  moveSpeed: 600,
  deltaOffset: 1.3,
  width,
  height,
  superClusterProvider: () =>new Supercluster(),
})(class Map extends React.Component<Props, State> {

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


