import React,{useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Platform,Pressable,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {WebView} from 'react-native-webview';

const APP_URL='https://shortforge-ai-production.up.railway.app/';
export default function Home(){
 const web=useRef(null),[loading,setLoading]=useState(true),[canBack,setCanBack]=useState(false),[error,setError]=useState(false);
 React.useEffect(()=>{if(Platform.OS!=='android')return;const s=BackHandler.addEventListener('hardwareBackPress',()=>{if(canBack){web.current?.goBack();return true}return false});return()=>s.remove()},[canBack]);
 return <SafeAreaView style={styles.root}>
   <View style={styles.bar}><Text style={styles.logo}>⚡ ShortForge AI</Text><Text style={styles.mobile}>MOBILE</Text></View>
   {error?<View style={styles.center}><Text style={styles.title}>Can't connect</Text><Text style={styles.copy}>Check your internet connection and try again.</Text><Pressable style={styles.button} onPress={()=>{setError(false);web.current?.reload()}}><Text style={styles.buttonText}>Try again</Text></Pressable></View>:
   <WebView ref={web} source={{uri:APP_URL}} sharedCookiesEnabled thirdPartyCookiesEnabled javaScriptEnabled domStorageEnabled
     onLoadStart={()=>setLoading(true)} onLoadEnd={()=>setLoading(false)}
     onNavigationStateChange={s=>setCanBack(s.canGoBack)}
     onError={()=>{setLoading(false);setError(true)}}
     setSupportMultipleWindows={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}/>}
   {loading&&!error?<View style={styles.loader}><ActivityIndicator size="large"/><Text style={styles.copy}>Opening ShortForge…</Text></View>:null}
 </SafeAreaView>
}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:'#080d18'},bar:{height:50,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#0b1020'},logo:{fontSize:18,fontWeight:'800',color:'#fff'},mobile:{fontSize:11,fontWeight:'800',color:'#a7b0c0'},loader:{...StyleSheet.absoluteFillObject,top:50,alignItems:'center',justifyContent:'center',gap:12,backgroundColor:'#080d18'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:14},title:{fontSize:24,fontWeight:'800',color:'#fff'},copy:{color:'#a7b0c0',textAlign:'center'},button:{paddingVertical:12,paddingHorizontal:22,borderRadius:12,backgroundColor:'#fff'},buttonText:{fontWeight:'800',color:'#080d18'}
});