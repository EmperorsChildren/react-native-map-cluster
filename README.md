# react-native-map-cluster

[cmapper](https://apps.apple.com/jp/app/cmapper/id935586290) or [8xplorer](https://apps.apple.com/app/apple-store/id1460433285?mt=8&l=ja) like smooth map clustering library for both iOS and Android.

iOS  
![demo](/image/anim.gif)

Android  
![demo](/image/anim_android.gif)

## Installation

1. install dependency

```
yarn add supercluster @types/supercluster @placemarkio/geo-viewport react-native-maps
```

2. install library

```
 yarn add @emperorschildren/react-native-map-cluster
```

## Usage

Complete examples is [Here](/example/sampleProject)

There are only keypoint in this README.

- use `withAnimatedCluster`
- use `onRegionChanged` for MapView#onRegionChangeComplete

```ts
import React, {Fragment} from 'react';
import {Dimensions,Image,SafeAreaView,StatusBar,StyleSheet,Text,View } from 'react-native';
import { AnimatedMarker, withAnimatedCluster } from '@emperorschildren/react-native-map-cluster';
import MapView, {MarkerAnimated} from 'react-native-maps';
import Supercluster from 'supercluster';

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

      const { initialRegion } = this.props;

      // here is the property that the HoC injects.
      const {animatedMarkers, onRegionChanged} = this.props;

      return (
        <MapView

          // recreate cluster when the region changes
          onRegionChangeComplete={onRegionChanged}

          initialRegion={initialRegion}
          style={styles.map}>

          // render markers
          {animatedMarkers.map(this.renderMarker)}

        </MapView>
      );
    }
}
```

- Use wrapped component with required props `markers` and `initialRegion`

```ts
const App = () => {
  return (
    <Fragment>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <Component
          // {id , coorinates: { latitude, longitude}} is required for each markers
          markers={markers}
          initialRegion={{
            ...markers[0].coordinate,
            latitudeDelta: 0,
            longitudeDelta: 0,
          }}
        />
      </SafeAreaView>
    </Fragment>
  );
};
```

## Props

### withAnimatedCluster

#### Arguments

| Name                 | Type               | Default | Note                                                                                                                                                                   |
| -------------------- | ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| moveSpeed            | number             | 600     | the animating speed of split or synthesize cluster                                                                                                                     |
| deltaOffset          | number             | 1.3     | the value to suppress marker spreading to the outside of the window when splitting cluster. Set smaller value if the icon is small or bigger value if the icon is big. |
| width                | number             | null    | dimension width of map                                                                                                                                                 |
| height               | number             | null    | dimension height of map                                                                                                                                                |
| superClusterProvider | () => Supercluster | null    | the function to create the Supercluster                                                                                                                                |

#### Required props to use wrapped component

| Name          | Type     | Note                              |
| ------------- | -------- | --------------------------------- |
| markers       | Marker[] | Markers to display on the MapView |
| initialRegion | Region   | initial region of MapView         |

```ts
type Marker = {
  coordinate: Region
  id: number | string
}
```

#### Injected props

| Name            | Type                    | Note                                                                                    |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| animatedMarkers | AnimatedMarkers[]       | Converted to markers to animate. render this markers                                    |
| region          | Region                  | Current region                                                                          |
| clusters        | Cluster[]               | Current clusters                                                                        |
| onRegionChanged | (region:Region) => void | function to cluster markers with current region. Set as MapView#onRegionChangeCompleted |

```ts
type AnimatedMarkers = {
  coordinate: AnimatedRegion
  id: number | string
  getCluster: (clusters: Cluster[]) => Cluster | undefined
}
```

```ts
type Clusters = {
  properties: {
    point_count: number // count of markers in this cluster
  }
  userExtension: {
    getCenterPosition: () => Region
  }
}
```

`getCenterPosition` is required for splitting cluster on marker pressed

```ts
renderMarker(marker: AnimatedMarker) {

    const {clusters, region} = this.props;

    const currentCluster = marker.getCluster(clusters);
    const markersInClusterCount = currentCluster ? currentCluster.properties.point_count : 0;

    return (
       <MarkerAnimated
         key={marker.id}
         coordinate={marker.coordinate}

         // split cluster when markers is pressed.
         onPress={() => markersInClusterCount && this.map.animateToRegion(currentCluster.userExtension.getCenterPosition()}>
         <...>
       </MarkerAnimated>
    );
}

```
