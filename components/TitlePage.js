import { Text, View , TouchableOpacity} from 'react-native'
import React, { Component } from 'react'
import { Button, Menu, Divider, PaperProvider } from 'react-native-paper';
import { Entypo } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { Auth } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class TitlePage extends Component {

    state = {
        visible: false,
    }

    handleLogout = () => {
      signOut(Auth).then(async() => {
      await AsyncStorage.removeItem('profile');
       this.props.navigation.replace('SignUpAndSignIn');
      }).catch((error) => {
       // An error happened.
      });

    }
    handleHistory = () => {
      this.props.navigation.navigate('History');
      this.setState({visible: false});
    }

    handleSettings = () => {
      this.props.navigation.navigate('Settings');
      this.setState({visible: false});
    }

  handleWatchList = () => {
      this.props.navigation.navigate('WatchList');
      this.setState({visible: false});
  }
  openMenu = () => this.setState({visible: true});

  closeMenu = () => this.setState({visible: false});

  render() {

    return (

        <View style={{
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            marginBottom:20,
            marginTop:25,
            position:'relative',
          }}>

          <View style={{
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:5,
          }}>
          <MaterialIcons name="live-tv" size={40} color="coral" style={{
            opacity:0.8
          }}/>
           <Text style={{
             fontSize:35,
             fontWeight:'bold',
             color:'white',
             opacity:0.8,

            }}>
              Ani<Text style={{
                color:'coral',
                textAlign:'center',
                fontWeight:'bold',
              }}>mist</Text>
            </Text>
          </View>

          <Menu
            visible={this.state.visible}
            onDismiss={this.closeMenu}
            style={{
              position:'absolute',
              left:223,
              top:50,
              width:130,

            }}
            anchor={
              <TouchableOpacity onPress={this.openMenu}>
              <Entypo name="dots-three-vertical" size={20} color="white" style={{
                position:'relative',
                left:90,
                opacity:0.8,
              }}/>
              </TouchableOpacity>
              }
            >
            <Menu.Item onPress={this.handleLogout} title="Log-out" leadingIcon='logout'/>
            <Divider />
            <Menu.Item onPress={this.handleHistory} title="History" leadingIcon='history'/>
            <Menu.Item onPress={this.handleWatchList} title="Watchlist" leadingIcon='playlist-play' />
            <Menu.Item onPress={this.handleSettings} title="Account" leadingIcon='account' />
          </Menu>

              </View>
    )
  }
}

export default React.memo(TitlePage)