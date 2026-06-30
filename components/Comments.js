import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Animated, Keyboard, ScrollView} from 'react-native'
import React, { Component } from 'react'
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp} from 'firebase/firestore';
import { myContext } from '../context';
import { Foundation } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import moment from 'moment';
import { Avatar } from 'react-native-paper';
import { MotiView } from 'moti';
import { Octicons } from '@expo/vector-icons';
import Modal from "react-native-modal";
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

const ProfileModal = React.memo(({handleCloseModal,visible, files, load}) => {

  return (

    <Modal isVisible={visible} animationIn='slideInLeft' animationOut='fadeOut'>
    <View style={{
      height:100,
      marginHorizontal:10,
      justifyContent:'center',
      alignItems:'center',
      flexDirection:'row',
      backgroundColor:'rgba(0,0,0,0.8)',
      gap:10,
      position:'relative',
      borderRadius:10,
    }}>

   {load? (
    <ActivityIndicator size="large" color="coral" />
   ):
    files.img && (
<Image
style={{ width: 60, height: 60,borderRadius:50}}
source= {{ uri: files.img }}
contentFit="cover"
transition={1000}
/>
    ) ||

!files.img && (
<Avatar.Text size={45} label={files.sb} color='white' style={{
  backgroundColor:'coral',
  opacity:0.8,
  fontWeight:'bold',
  }} />
    )}

  <View>
  <Text style={{
    color:'white',
    fontSize:25,
    fontWeight:'bold',
    opacity:0.9,
  }}>{files?.username}.</Text>
  <View style={{
    flexDirection:'row',
  }}>
  <Text style={{
    color:'white',
    fontSize:15,
    opacity:0.5,
    fontStyle:'italic'
  }}>@{files?.fn}</Text>
  <Text style={{
    color:'white',
    fontSize:15,
    opacity:0.5,
    textTransform:'capitalize',
    fontStyle:'italic'
  }}>{files?.ln}</Text>

  </View>
  </View>
  <View style={{
    position:'absolute',
    right:10,
    top:-15,
  }}>
  <TouchableOpacity onPress={handleCloseModal}>
  <Feather name="x-circle" size={25} color="coral" />
  </TouchableOpacity>
  </View>

    </View>
   </Modal>

  )
})

export class Comments extends Component {

  static contextType = myContext;

  debounceTimer = null;

  constructor(props) {
    super(props);
    this.flatListRef = React.createRef();
    this. state = {
      comment: '',
      isloading:false,
      data:[],
      inputPosition: new Animated.Value(0),
      choose:null,
      profile: null,
      hidden: true,
      shouldPerformUpdateLogic:true,
      currentPage: 1,
      visible:false,
      files:{},
      load:false,
    }

    this.totalItems= this.props.allComments.length;
    this.itemsPerPage = 10;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
  }

  deleteComment = async (id) => {
    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (error) {
      console.log('error deleting');
    }

  }

  showProfile = (sb,fn, ln, img, username) => {
    const dt = {
      sb,
      fn,
      ln,
      img,
      username
    }
    this.setState({
      visible:true,
      files:dt,
      load:true,
    })
    setTimeout(() => {
      this.setState({load:false})
    }, 3000);
  }

  handleCloseModal = () => {
    this.setState((prev) => ({visible: !prev.visible}));
  }

  sendComments = () => {
    Keyboard.dismiss();
    const {profile} =  this.context;
    const subName = profile[0].data.firstname.charAt(0) + profile[0].data.lastname.charAt(0);

    if(!this.state.comment) {
      alert('Please enter a comment.');
      return;
    }
    this.setState((prev) => ({isloading: !prev.isloading, shouldPerformUpdateLogic:!prev.shouldPerformUpdateLogic}))
    const epId = this.props.choose;
    const userData = this.props.userData;
    this.setState({comment:''})

    addDoc(collection(db, 'comments'), {
      name: userData.user,
      userId: userData.id,
      animeId: epId,
      subName,
      image: profile[0].data.image,
      comments: this.state.comment,
      lastname: profile[0].data.lastname,
      firstname: profile[0].data.firstname,
      createdAt: serverTimestamp(),
    }).then(()=>{

        this.setState((prev)=>({isloading: !prev.isloading, shouldPerformUpdateLogic:!prev.shouldPerformUpdateLogic}))
        let pushPage = Math.ceil( this.state?.data.length / this.itemsPerPage );
        this.setState({currentPage: pushPage})
    })

  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.handleKeyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.handleKeyboardDidHide);

    const {profile} =  this.context;
    this.setState({
      data:this.props.allComments,
      currentPage:Math.ceil( this.props.allComments.length / this.itemsPerPage ),
      profile,
    })
    this.totalPages = Math.ceil(this.props.allComments.length / this.itemsPerPage)

  }

  scrollToEnd = () => {
    if (this.flatListRef.current) {
      this.flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if(this.state.shouldPerformUpdateLogic &&  prevProps.allComments.length !== this.props.allComments.length){
      this.setState({data:this.props.allComments, currentPage:Math.ceil( this.props.allComments.length / this.itemsPerPage ),});
      this.totalItems = this.props.allComments.length;
      this.totalPages = Math.ceil(this.props.allComments.length / this.itemsPerPage);
      this.scrollToEnd();
      return;
    }

    if(this.state.shouldPerformUpdateLogic &&  prevProps.allComments.length !== this.state.data.length){
      this.setState({data:prevProps.allComments, currentPage:Math.ceil( prevProps.allComments.length / this.itemsPerPage ),});
      this.totalItems = this.props.allComments.length;
      this.totalPages = Math.ceil(prevProps.allComments.length / this.itemsPerPage);
      this.scrollToEnd();
      return;
    }
  }

  handlePreviousPage = () => {
    if (this.state.currentPage > 1) {
      console.log(this.state.currentPage)
      this.setState((prevState) => ({
        currentPage: prevState.currentPage - 1,
      }));
    }
  };

  handleNextPage = () => {

    console.log(this.totalPages);
    if (this.state.currentPage < this.totalPages) {

      this.setState((prevState) => ({
        currentPage: prevState.currentPage + 1,
      }));
    }
  };

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  handleKeyboardDidShow = () => {
    this.setState({ hidden: false });
  };

  handleKeyboardDidHide = () => {
    this.setState({ hidden: true });
  };
  renderItems = () => {
    const {profile} =  this.context;
    const { currentPage } = this.state;
    const startIndex = (currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
    let com = this.state.data;

        const items = [];
        for (let i = startIndex; i < endIndex; i++) {

          items.push(

            <MotiView
            from={{
              opacity:0,
              top:20,
            }}
            animate={{
              opacity:1,
              top:0,
            }}
            transition={{
              type:'timing',
              delay:500,
            }}
            style={{
              marginTop:10,
              flexDirection:'row',
              alignItems: 'center',
              gap:5,
              paddingLeft:5,
              paddingTop:5,
            }}>

            <View>
              <TouchableOpacity disabled={profile[0].data.userId === com[i]?.data.userId} onPress={()=> this.showProfile(com[i].data.subName, com[i].data.firstname, com[i].data.lastname, com[i].data.image, com[i].data.name)}>
            <View  style={{
              flexDirection:'row',
              alignItems:'center',
              opacity:0.9,
              gap:6
            }}>

            {com[i]?.data.image && (
   <Avatar.Image size={25} source={{uri:profile[0].data.image === com[i]?.data.image ? com[i]?.data.image : com[i]?.data.image}} />
            )}

         {!com[i]?.data.image && (
   <Avatar.Text size={25} label={com[i]?.data.subName} color='white' style={{
    backgroundColor:'coral',
    opacity:0.8,
    fontWeight:'bold',
    }} />
          )}

            <View>
            <Text style={{
              color:this.props.userData.id ===  com[i]?.data.userId ? 'coral': 'white',
              fontWeight:'bold',
              fontSize:15,
              opacity:this.props.userData.id ===  com[i]?.data.userId ? 0.9 : 0.7,
            }}>{com[i]?.data.name} </Text>
            <Text style={{
              color:'gray',
              fontSize:10,
            }}>{ moment(com[i]?.data.createdAt?.toDate()).calendar()}</Text>
            </View>

           {com[i].data.userId ===  profile[0].data.userId && (
            <TouchableOpacity onPress={()=> this.deleteComment(com[i].id)}>
 <Octicons name="trash" size={13} color="white" style={{
  marginLeft:10,
  opacity:0.5,
}} />
 </TouchableOpacity>
           )}

          </View>
          </TouchableOpacity>
          <View style={{width:300, flexDirection:'row' , marginTop:5}}>
          <Text style={{flex: 1, flexWrap: 'wrap', color:'white', opacity:0.7}}>* {com[i]?.data.comments}
          </Text>
        </View>

            </View>

          </MotiView>

          );

        }

        return items.map((item, index) => <View key={index}>{item}</View>);

  };
  render() {

    return (

        <>
        <View style={{
          marginBottom:10,
         flexDirection:'row',
         alignItems:'center',
         gap:5,
         marginLeft:5,
         justifyContent:'space-between',
        }}>
          <View style={{
             flexDirection:'row',
             alignItems:'center',
             gap:5,
          }}>
          <Foundation name="comments" size={20} color="white" style={{
          opacity:0.7,
        }}/>
        <Text style={{
            color:'white',
            opacity:0.7,
        }}>Comment{this.state.data.length > 1 && 's'} * <Text style={{
          fontWeight:'bold',
        }}>{this.state.data.length}{this.state.data.length > 999 && 'k.'}</Text></Text>
          </View>

        <View style={{
          flexDirection:'row',
          marginRight:10,
          justifyContent:'center',
          alignItems:'center',
        }}>

        <TouchableOpacity onPress={this.handlePreviousPage}
        disabled={this.state.currentPage === 1 || !this.state.data.length}
        >
        <AntDesign name="left" size={20} color="white"  style={{
           opacity:this.state.currentPage === 1 || !this.state.data.length ? 0.5 : 0.8
        }}/>
        </TouchableOpacity>
        <Text style={{
          color:'coral',
          fontWeight:'bold',
          fontSize:20,
        }}> / </Text>
        <TouchableOpacity
          onPress={this.handleNextPage}
          disabled={this.state.currentPage === this.totalPages}
          >
        <AntDesign name="right" size={20} color="white" style={{
          opacity:this.state.currentPage === this.totalPages? 0.5 : 0.8
        }} />

        </TouchableOpacity>

        </View>

        </View>

         {this.state.hidden && (

<View style={{
  borderWidth:1,
  borderColor:'coral',
  height:150,
  borderTopLeftRadius:5,
  borderTopRightRadius:5,
  marginHorizontal:4,
  padding:15,
}}>

{!this.state.data.length ? (
  <View style={{
    justifyContent:'center',
    alignItems: 'center',
    height:115,
  }}>
    <Text style={{
      color:'white',
      opacity:0.8,
      fontWeight:'bold',
    }}>No comments found!</Text>
  </View>
  ):

  (

    <FlatList
ref={this.flatListRef}
data={this.renderItems()}
keyboardDismissMode='on-drag'
renderItem={({item})=> <View>{item}</View>}
  keyExtractor={(item, index) => index.toString()}
  onContentSizeChange={this.scrollToEnd}
  onEndReachedThreshold={0.5}
  updateCellsBatchingPeriod={10}
  maxToRenderPerBatch={10}
  removeClippedSubviews={true}
  initialNumToRender={10}
  />
  )}
</View>
         )}

        <View style={{
          flexDirection:'row',
          marginTop:10,
          justifyContent:'center',
          alignItems:'center',
          gap:5,
        }}>
        <TextInput
        placeholderTextColor='gray'
        multiline
        style={{
          height: 45,
          borderColor: 'gray',
          borderWidth: 1,
          padding:10,
          width:285,
          borderColor:'coral',
          borderBottomLeftRadius:10,
          color:'white',
          opacity:0.8,

        }}
        onChangeText={text => this.setState({ comment: text })}
        value={this.state.comment}
        placeholder="Input your comments here."
        />

    <TouchableOpacity style={{
      width:75,
      height:40,
      justifyContent:'center',
      alignItems:'center',
      backgroundColor:'coral',
      borderBottomRightRadius:10,
      height:47,
      opacity:0.9,
    }} onPress={this.sendComments}>
        {this.state.isloading ? (
           <View style={{
            margin:2,
           }}>
           <ActivityIndicator size="small" color="white" />
          </View>
        ):(
          <Text style={{
            color:'white',
        }}>
           <Ionicons name="send" size={25} color="white" />
        </Text>
        )}

    </TouchableOpacity>
      <ProfileModal

      handleCloseModal={this.handleCloseModal}
      visible={this.state.visible}
      files={this.state.files}
      load={this.state.load}
      />
        </View>

      </>

    )
  }
}

export default React.memo(Comments)