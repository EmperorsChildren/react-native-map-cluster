import * as React from 'react';
import { AnimatedRegion, Region } from 'react-native-maps';
import Supercluster from 'supercluster';
export interface Cluster {
    properties: {
        item: Marker;
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
        getCenterPosition: () => Region;
    };
}
interface Marker {
    coordinate: Region;
    id: number | string;
}
type AnyMarker = Marker & any;
export interface AnimatedMarker {
    coordinate: AnimatedRegion;
    id: number | string;
    getCluster: (clusters: Cluster[]) => Cluster | undefined;
}
export interface InjectedProps {
    region: Region;
    clusters: Cluster[];
    onRegionChanged: (region: Region) => void;
    animatedMarkers: AnimatedMarker[];
}
export interface OriginalProps {
    markers: AnyMarker[];
    initialRegion: Region;
}
export declare const withAnimatedCluster: (options: {
    width: number;
    height: number;
    deltaOffset: 1.3;
    superClusterProvider: () => Supercluster;
    moveSpeed: 600;
}) => <T extends OriginalProps>(WrappedComponent: React.ComponentType<T & InjectedProps>) => React.ComponentType<T>;
export {};
