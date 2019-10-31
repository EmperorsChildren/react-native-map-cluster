# Example

## iOS

```
yarn 
cd ios
pod install
cd .. 
yarn ios
```

## Android

Set your GoogleMap API key into `AndroidManifest.xml`

```xml
<application ... > 
   <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="Your API Key"/>
</application>
```

```
yarn 
yarn android
```
