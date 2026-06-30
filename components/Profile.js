import { Text, View, TouchableOpacity } from 'react-native'
import React, { Component } from 'react'
import { ActivityIndicator, Avatar } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { myContext } from '../context';

export class Profile extends Component {
  static contextType = myContext;
  render() {

    const {username, firstname, lastname, image } = this.props.usersData;
    const avatarName = `${firstname.charAt(0).trim()} ${lastname.charAt(0).trim()}`;

    return (
        <View style={{
            marginBottom:20,
            marginHorizontal:20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems:'center',
        }}>
        <View style={{
          flexDirection:'row',
          alignItems:'center',
          gap:10,
        }}>
        <View style={{
          borderWidth:1,
          borderRadius:50,
          borderColor:'coral',
          padding:2,
        }}>
        {!image ? (
         <Avatar.Text size={60} label={avatarName.split(' ').join('')} color='white' style={{
          backgroundColor:'coral',
          opacity:0.8,
          fontWeight:'bold',
        }} />
        ): (
          <Avatar.Image size={60} source={{uri:image}} />
        )}
        </View>
        <View>
          <Text style={{
            color:'white',
            opacity:0.7,
          }}>
            Welcome user.
          </Text>
          <Text style={{
            color:'white',
            fontWeight:'bold',
            fontSize:30,
            opacity:0.9
          }}>{!username?  <ActivityIndicator size="small" color="coral" style={{
            paddingRight:5,
            paddingTop:7,
          }} /> : username} <MaterialCommunityIcons name="hand-wave-outline" size={30} color="coral" style={{
            opacity:0.7
          }} /></Text>
        </View>
        </View>

        <View style={{
            flexDirection:'row',
            justifyContent:'center',
            alignItems:'center',
            gap:5,
        }}>
       <TouchableOpacity onPress={()=> this.props.navigation.navigate('Genres')}>
        <MaterialIcons name="category" size={30} color="white" style={{
            opacity:0.8,
        }} />
        </TouchableOpacity>
        <Text style={{
            color:'coral',
            fontWeight:'bold',
            fontSize:40,
        }}>/</Text>
        <TouchableOpacity onPress={()=> this.props.navigation.navigate('Search')}>
        <Ionicons name="search" size={30} color="white" style={{
            opacity:0.8,
        }}/>
        </TouchableOpacity>
        </View>

      </View>

    )
  }
}

export default Profile