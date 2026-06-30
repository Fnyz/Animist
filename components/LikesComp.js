import { Text, View, TouchableOpacity,ActivityIndicator} from 'react-native'
import React, { Component, useMemo } from 'react'
import { addDoc, collection , serverTimestamp, doc, deleteDoc} from 'firebase/firestore';
import { db } from '../firebase';
import { myContext } from '../context';
import { Octicons } from '@expo/vector-icons';

export class LikesComp extends Component {

    static contextType = myContext;
    contextValue = this.context;

    constructor(props) {
      super(props);
      this.state = {
        isClick:false,
        allLikeData:[],
        userProf:null,
        shouldPerformUpdateLogic: true,
      }

      this.memoizedValue = this.calculateMemoizedValue();
    }

    debounceTimer = null;

  handleLike = () => {

     const epId = this.props.choose;
     const exist =  this.state.allLikeData.find(l => l.data.userId === this.state.userProf.id &&
      l.data.animeId === epId);
     if(!exist){
      clearTimeout(this.debounceTimer);
      this.props.onDebounceStart();
      this.setState((prev) => ({isClick:!prev.isClick, shouldPerformUpdateLogic:!prev.shouldPerformUpdateLog}));
      this.debounceTimer = setTimeout(() => {
        addDoc(collection(db, 'likes'), {
          name: this.state.userProf.user,
          userId: this.state.userProf.id,
          animeId: epId,
          createdAt: serverTimestamp(),
      }).then(()=>{
        this.setState((prev) => ({isClick: !prev.isClick, shouldPerformUpdateLogic:!prev.shouldPerformUpdateLog}));

      })
      this.props.onDebounceEnd();
      }, 300);

     }else{
      clearTimeout(this.debounceTimer);
      this.props.onDebounceStart();
      this.setState((prev => ({isClick:!prev.isClick, shouldPerformUpdateLogic:!prev.shouldPerformUpdateLog})));
      this.debounceTimer = setTimeout(() => {
        deleteDoc(doc(db, 'likes', exist.id)).then(()=> {
          this.setState((prev => ({isClick:!prev.isClick, shouldPerformUpdateLogic:!prev.shouldPerformUpdateLog})));

        });
        this.props.onDebounceEnd();
      }, 300);

     }

  }

  componentDidMount(){
    const ls = this.context;
    this.setState({
      allLikeData: this.props.likesData,
      userProf:ls.userData,
    })
  }

  componentDidUpdate(prevProps, prevState){
    if(this.state.shouldPerformUpdateLogic && prevProps.likesData.length !== this.state.allLikeData.length){
      this.memoizedValue = this.calculateMemoizedValue();
      this.setState({allLikeData:prevProps.likesData});
    }
  }

  componentWillUnmount() {
    clearTimeout(this.debounceTimer);
  }

  calculateMemoizedValue() {
    const isheart = this.props.likesData.find(l => l.data.userId === this.props.userData.id && l.data.animeId === this.props.choose)
    return isheart;
  }

  render() {

    return (

        <View style={{
            flexDirection:'row',
            gap:10,
            height:50,
            justifyContent:'center',
            alignItems:'center',
            marginTop:10,
            marginRight:5,
            opacity:0.8,
          }}>
          <View style={{
            alignItems:'center',
            gap:10,
            flexDirection:'row',
            justifyContent:'center',
          }}>
          {this.state.isClick ? (
            <ActivityIndicator size="small" color="coral" />
          ):(
            <TouchableOpacity onPress={()=>this.handleLike()}>
            {this.memoizedValue ? <Octicons name="heart-fill" size={24} color="coral" /> : <Octicons name="heart" size={24} color="coral" />}
          </TouchableOpacity>
          )}

          <Text style={{
            color:'white',
            opacity:0.7,
            fontSize:15,
            fontWeight:'bold',
            paddingBottom:5,
          }}><Text style={{
            fontSize:20,
          }}>| </Text> {this.state.allLikeData?.length ? this.state.allLikeData?.length : 0}{this.state.allLikeData.length > 999 ? 'k': ''}</Text>
          </View>
          </View>
    )
  }
}

export default React.memo(LikesComp);