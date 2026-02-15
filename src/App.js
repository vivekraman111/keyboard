import './App.css';
import React from 'react';

function App() {
  return (
    <KeyboardApp />
  );
}

export default App;

class KeyboardApp extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      txt: "",
      lastButtondownEvent: null,
    };
    this.txtRef = React.createRef();
    this.childRef = React.createRef();
    this.copyToClipboardSvg = <CopyToClipboardIcon width="35" height="35"/>
    this.clearAllTextSvg = <ClearAllTextIcon width="20" height="20" />
    this.handleTextChange = this.handleTextChange.bind(this);
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleClearAllText = this.handleClearAllText.bind(this);
  }
  
  componentDidMount() {
    var ele = this.txtRef.current;
    ele.focus();
  }
  
  handleTextChange(event){
    this.setState({txt: event.target.value});
  }
  
  handleButtonClick(chr){
    const ele = this.txtRef.current;
    const start = ele.selectionStart;
    const end = ele.selectionEnd;
    this.setState(prevState => {
      return({
        txt: prevState.txt.slice(0, start) + chr + prevState.txt.slice(end)
      })
    }, 
      () => {
      ele.focus();
      ele.selectionStart = start + 1;
      ele.selectionEnd = end + 1;
    })
  }
  
  handleClearAllText(){
    this.setState({txt: ""});
  }
  
  handleCopyToClipboard(){
    const ele = this.txtRef.current;
    const start = ele.selectionStart;
    const end = ele.selectionEnd;
    
    ele.focus();
    ele.select();
    
    try {
      var successful = document.execCommand("copy");
    } catch (err) {
      console.error("Oops, unable to copy", err);
    }

    ele.selectionStart = start;
    ele.selectionEnd = end;
  }
  
  handleKeydown(event){
    const nativeEvent = event.nativeEvent
    const {code, ctrlKey, shiftKey, altKey, metaKey} = nativeEvent
    const keyboard = this.childRef.current
    if(keyboard.key_is_mapped(code, ctrlKey, shiftKey, altKey, metaKey)){
      event.preventDefault()
    }
    this.setState({lastButtondownEvent: nativeEvent});
    setTimeout(() => {
      this.setState({lastButtondownEvent: null});
    }, 200)
  }
  
  render(){
    return (
      <div className="app">
        <div className="display">
          <textarea
            onChange={this.handleTextChange}
            onKeyDown={this.handleKeydown}
            value={this.state.txt}
            dir="rtl"
            ref={this.txtRef}
          />
        </div>
        <Keyboard
          language="hebrew"
          ref_language="english"
          layout="standard"
          keyboard="macbookpro"
          onButtonClick={this.handleButtonClick}
          copyToClipboardSvg={this.copyToClipboardSvg}
          onCopyToClipboard={this.handleCopyToClipboard}
          clearAllTextSvg={this.clearAllTextSvg}
          onClearAllText={this.handleClearAllText}
          lastButtondownEvent={this.state.lastButtondownEvent}
          ref={this.childRef}
        />
      </div>
    )
  }
}

class Keyboard extends React.Component{
  constructor(props){
    super(props)
    this.state = {
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    };
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.getKeyFace = this.getKeyFace.bind(this);
    this.KEY_MARGIN = 5
    this.KEYBOARD_PADDING = 10
    this.KEYBOARD_BORDER = 1

    this.mac_key_spec_idx = this.make_idx(mac_key_spec,
                                          ["id"],
                                          "obj")
    this.keyslots_idx = this.make_idx(
      keyslots, ["name"]
    )
    this.keyboard_mapping_idx =
      this.make_idx(keyboard_mapping, 
                    ["language", "layout", "keyboard",
                     "keyCode", "ctrlKey", "shiftKey",
                     "altKey", "metaKey"],
                   "obj")
    this.keyboard_mapping_arr_idx =
      this.make_idx(keyboard_mapping, 
                    ["language", "layout", "keyboard",                              "keyCode"], "arr")
    this.characters_idx =
      this.make_idx(characters,
                    ["id"],
                   "obj")
    this.keyboard_codes_idx =
      this.make_idx(keyboard_codes,
                    ["keyboard"],
                   "arr")
    
    const row_sizes = this.keyboard_codes_idx[this.props.keyboard]
    .map(key => {
        let key_id = key.key_spec_id
        let key_spec = this.mac_key_spec_idx[key_id]
        return({
                 row: key.row,
                 width: key_spec.width + 
                    (key.type === "group" ? 0 : 2*this.KEY_MARGIN),
                 height: key_spec.height +
                    (key.type === "group" ? 0 : 2*this.KEY_MARGIN),
                 group: key.group
        })
    })
    .filter(key_size => key_size.group === null)
    .reduce((row_size, key_size) => {
      let row = row_size[key_size.row]
        row_size[key_size.row] = row ? {width: row.width + key_size.width, height: Math.max(row.height, key_size.height)}
                                : {width: key_size.width, height: key_size.height}
        return row_size
    }, Object.create(null))

    const kb_size = Object.entries(row_sizes)
    .map(row_size => [row_size[1].width, row_size[1].height])
    .reduce((kb_size, row_size) => 
            ([Math.max(kb_size[0], row_size[0]),
              kb_size[1] + row_size[1]]))

    this.kb_width = kb_size[0] + 2*this.KEYBOARD_PADDING + 2*this.KEYBOARD_BORDER
    this.kb_height = kb_size[1] + 2*this.KEYBOARD_PADDING + 2*this.KEYBOARD_BORDER
  }
  
  /* creates an index from an array of objects
     can also create multi-dimensional indices.
     
     idx_type of "obj": single object at end of
     path (path points to single object)
     idx_type of "arr": array of objects at end
     of path (path points to array of objects)
     
     All values of fields in key_arr must comply with
     javascript object key naming rules (what are they?)
     
     probably does not work with dates as keys */
  make_idx(obj_arr, key_arr, idx_type="obj", idx=null){
    if(!idx){
      idx = Object.create(null)
    }

    if(!Array.isArray(key_arr)) key_arr = [key_arr]

    if(key_arr.length === 1 && idx_type === "obj"){
        return obj_arr.reduce((idx_next, obj) => {
            idx_next[obj[key_arr[0]]] = obj;
            return idx_next;
        }, Object.create(null))
    }

    for(let obj of obj_arr){
        if(idx[obj[key_arr[0]]]) continue
        if(idx_type === "arr" && key_arr.length === 1){
          idx[obj[key_arr[0]]] = 
            obj_arr.filter(o => o[key_arr[0]] === obj[key_arr[0]])
        }
        else{
            idx[obj[key_arr[0]]] = this.make_idx(
              obj_arr.filter(o => o[key_arr[0]] === obj[key_arr[0]]),
              key_arr.slice(1),
              idx_type,
              Object.create(null))
        }
    }
    return idx
  }
  
  /* returns the indexed object given an index
     and the path to it. Useful in case of
     multi-dimensional (deeply nested) indices */
  get_idx(idx, path_arr){
    for(let key_val of path_arr){
        if(!idx || !idx[key_val]) return null
        idx = idx[key_val]
    }
    return idx;
  }
  
  /* returns true if the key is mapped on this Keyboard */
  key_is_mapped(code, ctrlKey, shiftKey, altKey, metaKey){
    return Boolean(this.get_idx(this.keyboard_mapping_idx, [this.props.language, this.props.layout, this.props.keyboard, code, ctrlKey, shiftKey, altKey, metaKey]))
  }
  
  componentDidUpdate(prevProps) {
    /* Check that lastButtondownEvent has changed and not something else */
    if (this.props.lastButtondownEvent && this.props.lastButtondownEvent !== prevProps.lastButtondownEvent) {
      const {code, ctrlKey, shiftKey, altKey, metaKey} = this.props.lastButtondownEvent
      const key_mapping = 
              this.get_idx(this.keyboard_mapping_idx, [this.props.language, this.props.layout, this.props.keyboard, code, ctrlKey, shiftKey, altKey, metaKey])
      if(key_mapping){
        let chr = this.characters_idx[key_mapping.charId]
        if(chr.action_type === "function"){
          this.props[chr.action_value]()
        }
        else{
          this.props.onButtonClick(chr.display_value)
        }
      }      
    }
  }
  
  handleButtonClick(event){
    const key_mapping = 
                this.get_idx(this.keyboard_mapping_idx,
                             [this.props.language,
                              this.props.layout,
                              this.props.keyboard,
                              event.target.id,
                              this.state.ctrlKey,
                              this.state.shiftKey,
                              this.state.altKey,
                              this.state.metaKey,
                             ])
    if(key_mapping){
      let chr = this.characters_idx[key_mapping.charId]
      let display_value = (chr.display_type === "text" ?
              chr.display_value :
              this.props[chr.display_value])
      if(chr.action_type === "function"){
        this.props[chr.action_value]()
      }
      else{
        this.props.onButtonClick(display_value)
      }
    }
    
  }
  
  getKeyFace(key){
    let key_face_arr = []
    let key_map_arr = this.get_idx(
      this.keyboard_mapping_arr_idx, [this.props.language,
                                      this.props.layout,
                                      this.props.keyboard,
                                      key.code])
    if(!key_map_arr) return null
    
    for(let key_map_row of key_map_arr){
      if(key_map_row.keyslot){
        let chr = this.characters_idx[key_map_row.charId]
        let display_value = (chr.display_type === "text" ?
                             chr.display_value :
                             this.props[chr.display_value])
        let tooltip = chr.tooltip
        key_face_arr.push(
          <div
            style={{...this.keyslots_idx[key_map_row.keyslot].css,
              order: key_map_row.keyslot_order,
              pointerEvents: "none"}}
            title={tooltip}
            key={key_map_row.keyslot_order}
            >
            {display_value}
          </div>
        )
      }
      
      if(key_map_row.keyslot_ref && this.props.ref_language){
        let ref_map_row = this.get_idx(
          this.keyboard_mapping_idx, 
          [this.props.ref_language, this.props.layout,
           this.props.keyboard, key.code,
           key_map_row.ctrlKey, key_map_row.shiftKey,
           key_map_row.altKey, key_map_row.metaKey])
        if(!ref_map_row) continue
        
        let chr = this.characters_idx[ref_map_row.charId]
        let display_value = (chr.display_type === "text" ?
                             chr.display_value :
                             this.props[chr.display_value])
        let tooltip = chr.tooltip
        key_face_arr.push(
          <div
            style={{...this.keyslots_idx[key_map_row.keyslot_ref].css,
                   order: key_map_row.keyslot_ref_order,
                   pointerEvents: "none"}}
            title={tooltip}
            key={key_map_row.keyslot_ref_order}
            >
            {display_value}
          </div>
        )
      }
    }
    return key_face_arr
  }
  
  get_keyboard(keys, class_name, width, height, key_group){
    return(
      <div
        className={class_name}
        style={{width: width, height: height}}
        key={key_group}
      >
        {keys
          .filter(key => key.group === key_group)
          .map(key => {
            const key_spec =
                    this.mac_key_spec_idx[key.key_spec_id]

            let classname = key.type === "key" ? "key" : key.code
            let evt = this.props.lastButtondownEvent
            let background_color = (evt && evt.code === key.code ?
                                   "lightgreen" : "white")

            return(key.type === "key" ?
                  (<div
                     onClick={this.handleButtonClick}
                     className={classname}
                     key={key.code}
                     id={key.code}
                     style={{
                      width: key_spec.width + key_spec.units,
                      height: key_spec.height + key_spec.units,
                      backgroundColor: background_color,
                     }}
                  >
                  {this.getKeyFace(key)}
                  </div>) :
                  this.get_keyboard(keys, key.code, 
                                key_spec.width + key_spec.units,
                                key_spec.height + key_spec.units,
                                key.code)
            )
        }
        )}
        </div>
    )
  }
  
  render(){
    return(
      this.get_keyboard(
        this.keyboard_codes_idx[this.props.keyboard],
        "keyboard",
        this.kb_width + "px",
        this.kb_height + "px",
        null
      )
    )
  }
}

const fonts = ["Ezra SIL", "Ezra SIL SR"]

const CopyToClipboardIcon = ({width, height}) => (
  <svg viewBox="0 0 48 48" width={width} height={height}>
 <defs>
  <linearGradient id="b">
   <stop stopColor="#f0f0ef" offset="0"/>
   <stop stopColor="#e8e8e8" offset=".59929"/>
   <stop stopColor="#fff" offset=".82759"/>
   <stop stopColor="#d8d8d3" offset="1"/>
  </linearGradient>
  <linearGradient id="a">
   <stop stopColor="#fff" offset="0"/>
   <stop stopColor="#fff" stopOpacity="0" offset="1"/>
  </linearGradient>
  <linearGradient id="f" x1="42.158" x2="39.827" y1="44.492" y2="41.804" gradientUnits="userSpaceOnUse">
   <stop stopColor="#7c7c7c" offset="0"/>
   <stop stopColor="#b8b8b8" offset="1"/>
  </linearGradient>
  <linearGradient id="e" x1="39.558" x2="40.332" y1="40.58" y2="41.729" gradientUnits="userSpaceOnUse" href="#a"/>
  <linearGradient id="d" x1="22.308" x2="35.785" y1="18.992" y2="39.498" gradientTransform="matrix(1.0657 0 0 .9876 -8.5483 -4.8917)" gradientUnits="userSpaceOnUse" href="#b"/>
  <linearGradient id="c" x1="19.067" x2="23.795" y1="21.757" y2="37.041" gradientUnits="userSpaceOnUse" href="#a"/>
  <linearGradient id="h" x1="32.052" x2="36.785" y1="30.73" y2="46.041" gradientUnits="userSpaceOnUse" href="#a"/>
  <linearGradient id="g" x1="22.308" x2="35.785" y1="18.992" y2="39.498" gradientTransform="matrix(1.0672 0 0 .98928 4.3917 4.0352)" gradientUnits="userSpaceOnUse" href="#b"/>
 </defs>
 <g transform="matrix(1.0015 0 0 1.0006 -.050022 -.063049)" opacity=".5">
  <path d="m20.162 34.033h13v2h-13z" fillRule="evenodd" opacity=".17045"/>
  <path d="m2.1141,1.56293h29.82025a.56566,.56616 0 0,1 .56566.56616v34.84437a.56566,.56616 0 0,1 -.56566.56616h-29.82025a.56566,.56616 0 0,1 -.56566-.56616v-34.84437a.56566,.56616 0 0,1 .56566-.56616" fill="url(#d)" fillRule="evenodd" stroke="#888a85" strokeWidth=".99894"/>
  <path d="m2.5325 2.5606h28.971v33.981h-28.971z" fill="none" stroke="url(#c)" strokeWidth=".99894"/>
  <path d="m7.0161 10.033h21v2h-21z" fillRule="evenodd" opacity=".17045"/>
  <path d="m7.0161 14.033h20v2h-20z" fillRule="evenodd" opacity=".17045"/>
  <path d="m7.0161 18.033h18v2h-18z" fillRule="evenodd" opacity=".17045"/>
  <path d="m7.0161 22.033h21v2h-21z" fillRule="evenodd" opacity=".17045"/>
  <path d="m7.0161 26.033h13v2h-13z" fillRule="evenodd" opacity=".17045"/>
 </g>
 <path d="m15.07295,10.50085h29.85638c.31574,0 .56993.25309.56993.56747v27.16736c0,2.47645-6.87981,8.30309-9.26793,8.30309h-21.15838c-.31574,0-.56993-.25309-.56993-.56747v-34.90298c0-.31438.25419-.56747.56993-.56747z" fill="url(#g)" fillRule="evenodd" stroke="#888a85"/>
 <path d="m15.503 11.5h28.997v34.041h-28.997z" fill="none" stroke="url(#h)"/>
 <path d="m36.221 46.537c2.0304 0.3299 9.5888-4.5299 9.2844-8.4978-1.5633 2.4231-4.7585 1.2867-8.8673 1.4458 0 0 0.39537 6.5521-0.41713 7.0521z" fill="url(#f)" fillRule="evenodd" stroke="#868a84"/>
 <path d="m37.671 44.345c1.3698-0.68383 4.4282-2.1465 5.7276-4.0275-1.5961 0.68005-2.9478 0.2095-5.7023 0.1904 0 0 0.16232 3.0621-0.0253 3.8371z" fill="none" opacity=".36932" stroke="url(#e)"/>
 <path d="m20 19.033h21v2h-21z" fillRule="evenodd" opacity=".17045"/>
 <path d="m20 23.033h19.992v2h-19.992z" fillRule="evenodd" opacity=".17045"/>
 <path d="m20 27.033h17.977v2h-17.977z" fillRule="evenodd" opacity=".17045"/>
 <path d="m20 31.033h21v2h-21z" fillRule="evenodd" opacity=".17045"/>
</svg>
);

const ClearAllTextIcon = ({width, height}) => (
  <svg viewBox="0 0 640 480" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
   <path d="m629.76 61.296l15.824 13.316c-1.3928 3.2384-4.9373 6.8389-10.592 10.875-2.8273 1.208-4.2618 2.4411-4.2618 3.6492 0 0.38648 0.71728 1.402 2.1099 3.0208-90.85 52.442-167.9 101.64-231.32 147.61 85.238 64.549 137.31 101.5 156.34 110.73-3.5446 11.31-11.266 19.986-23.25 26.027-4.22 2.0304-9.4946 4.4229-15.866 7.2498-11.225 5.2924-16.837 8.0956-16.837 8.5307v0.55609l3.1646 6.6457c-2.8691 0.79727-5.359 2.2236-7.4265 4.2289-7.7645 5.268-16.246 8.9172-25.36 10.923-2.8272 0-6.3292-1.208-10.634-3.6492-2.7848-1.1601-6.2875-2.61-10.507-4.2288-4.2618-1.6188-6.2874-2.4411-6.2874-2.4411-0.7598-0.38648-1.4346-0.604-2.1519-0.604 0 0-1.0972 0.43509-3.2072 1.2323-14.769 10.512-28.146 17.158-40.13 19.986-2.11 0-4.9372-0.60403-8.4393-1.8364-22.533-13.268-46.459-30.644-71.819-52.007-21.098-18.149-36.922-31.102-47.556-38.763l-10.507 8.4585-72.916 54.496c-9.1566 6.8632-35.192 27.453-78.191 61.698h-13.756l-20.128-12.663c1.4345-3.2384 2.1943-4.8572 2.1943-4.8572 1.3927-2.4168 2.0675-3.6005 2.0675-3.6005 0-2.4168-2.11-3.6492-6.3293-3.6492s-10.549 1.2567-18.989 3.6492c-0.75978 0-2.8272 0.57965-6.3293 1.8128-7.7645-2.4412-19.031-10.512-33.842-24.191-4.22-3.6005-6.2874-6.066-6.2874-7.274 0-0.79724 1.7726-2.6343 5.2746-5.462 4.9372-4.4708 7.3846-8.0721 7.3846-10.875 0-0.79724-3.502-5.5099-10.549-13.92-3.502-6.066-5.2321-9.0625-5.2321-9.0625l51.734-38.135 115.16-76.198c2.8273-2.4648 5.6545-4.4708 8.4393-6.066-45.742-45.578-83.044-90.746-111.95-135.55-6.3293-10.899-10.169-18.56-11.604-22.982 9.8738-8.8693 22.871-17.786 39.117-26.656 7.0472 3.2384 12.279 5.6788 15.824 7.274 2.7848 2.8276 5.612 4.2289 8.4393 4.2289 7.0472 0 11.604-2.9965 13.714-9.0625 2.1518-11.31 10.929-17.158 26.458-17.545 4.9373 0 11.604 2.61 20.044 7.8301 44.433 41.567 87.053 78.469 127.82 110.76 91.652-57.686 167.27-102.25 227.19-133.74 11.984-6.0417 18.609-9.0625 20.086-9.0625 3.5021 0 14.094 5.0269 31.732 15.104l6.2876 4.8572c0 0.79723-1.0547 2.1992-3.1648 4.2532-1.3926 0.79726-2.0674 1.5952-2.0674 2.3925 0 1.208 6.2874 4.4464 18.904 9.7152l15.908-2.4168 6.2849 5.3897v8e-6z" fill="#f00"/>
  </svg>
);

/* blank unmapped keys of the keyboard
   primary key: keyboard + code */
//mac_keys
const keyboard_codes = [
{keyboard: "macbookpro", code: "Escape", key: "Escape", mappable: true, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F1", key: "F1", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F2", key: "F2", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F3", key: "F3", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F4", key: "F4", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F5", key: "F5", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F6", key: "F6", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F7", key: "F7", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F8", key: "F8", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F9", key: "F9", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F10", key: "F10", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F11", key: "F11", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "F12", key: "F12", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "Power", key: "Power", mappable: false, row: 1, key_spec_id: "1", type: "key", group: null},
{keyboard: "macbookpro", code: "Backquote", key: "`", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit1", key: "1", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit2", key: "2", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit3", key: "3", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit4", key: "4", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit5", key: "5", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit6", key: "6", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit7", key: "7", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit8", key: "8", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit9", key: "9", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Digit0", key: "0", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Minus", key: "-", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Equal", key: "=", mappable: true, row: 2, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Backspace", key: "Backspace", mappable: true, row: 2, key_spec_id: "3", type: "key", group: null},
{keyboard: "macbookpro", code: "Tab", key: "Tab", mappable: true, row: 3, key_spec_id: "3", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyQ", key: "q", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyW", key: "w", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyE", key: "e", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyR", key: "r", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyT", key: "t", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyY", key: "y", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyU", key: "u", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyI", key: "i", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyO", key: "o", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyP", key: "p", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "BracketLeft", key: "[", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "BracketRight", key: "]", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Backslash", key: "\\", mappable: true, row: 3, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "CapsLock", key: "CapsLock", mappable: true, row: 4, key_spec_id: "4", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyA", key: "A", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyS", key: "S", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyD", key: "D", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyF", key: "F", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyG", key: "G", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyH", key: "H", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyJ", key: "J", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyK", key: "K", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyL", key: "L", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Semicolon", key: ";", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Quote", key: "'", mappable: true, row: 4, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Enter", key: "Enter", mappable: true, row: 4, key_spec_id: "4", type: "key", group: null},
{keyboard: "macbookpro", code: "ShiftLeft", key: "Shift", mappable: true, row: 5, key_spec_id: "5", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyZ", key: "Z", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyX", key: "X", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyC", key: "C", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyV", key: "V", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyB", key: "B", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyN", key: "N", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "KeyM", key: "M", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Comma", key: "", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Period", key: ".", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "Slash", key: "/", mappable: true, row: 5, key_spec_id: "2", type: "key", group: null},
{keyboard: "macbookpro", code: "ShiftRight", key: "Shift", mappable: true, row: 5, key_spec_id: "5", type: "key", group: null},
{keyboard: "macbookpro", code: "fn", key: "fn", mappable: false, row: 6, key_spec_id: "6", type: "key", group: null},
{keyboard: "macbookpro", code: "ControlLeft", key: "Control", mappable: true, row: 6, key_spec_id: "6", type: "key", group: null},
{keyboard: "macbookpro", code: "AltLeft", key: "Alt", mappable: true, row: 6, key_spec_id: "6", type: "key", group: null},
{keyboard: "macbookpro", code: "MetaLeft", key: "Meta", mappable: true, row: 6, key_spec_id: "7", type: "key", group: null},
{keyboard: "macbookpro", code: "Space", key: "", mappable: true, row: 6, key_spec_id: "8", type: "key", group: null},
{keyboard: "macbookpro", code: "MetaRight", key: "Meta", mappable: true, row: 6, key_spec_id: "7", type: "key", group: null},
{keyboard: "macbookpro", code: "AltRight", key: "Alt", mappable: true, row: 6, key_spec_id: "6", type: "key", group: null},
{keyboard: "macbookpro", code: "arrowkeys", key: "", mappable: false, row: 6, key_spec_id: "101", type: "group", group: null},
{keyboard: "macbookpro", code: "ArrowLeft", key: "ArrowLeft", mappable: true, row: 6, key_spec_id: "9", type: "key", group: "arrowkeys"},
{keyboard: "macbookpro", code: "ArrowUp", key: "ArrowUp", mappable: true, row: 6, key_spec_id: "9", type: "key", group: "arrowkeys"},
{keyboard: "macbookpro", code: "ArrowDown", key: "ArrowDown", mappable: true, row: 6, key_spec_id: "9", type: "key", group: "arrowkeys"},
{keyboard: "macbookpro", code: "ArrowRight", key: "ArrowRight", mappable: true, row: 6, key_spec_id: "9", type: "key", group: "arrowkeys"},
]

/* physical attributes of each type of key
   primary key: id */
const mac_key_spec = [
{id: "1", shape: "rect", width: 56.2, height: 25, units: "px", corner_radius: "4px", },
{id: "2", shape: "rect", width: 53, height: 50, units: "px", corner_radius: "4px", },
{id: "3", shape: "rect", width: 99, height: 50, units: "px", corner_radius: "4px", },
{id: "4", shape: "rect", width: 107, height: 50, units: "px", corner_radius: "4px", },
{id: "5", shape: "rect", width: 139, height: 50, units: "px", corner_radius: "4px", },
{id: "6", shape: "rect", width: 53, height: 60, units: "px", corner_radius: "4px", },
{id: "7", shape: "rect", width: 75, height: 60, units: "px", corner_radius: "4px", },
{id: "8", shape: "rect", width: 306, height: 60, units: "px", corner_radius: "4px", },
{id: "9", shape: "rect", width: 53, height: 25, units: "px", corner_radius: "4px", },
{id: "101", shape: "rect", width: 189, height: 70, units: "px", corner_radius: "0px", },
]

/* set of chars or functions to be mapped to keyboard
   primary key: id */
//hebrew_chars
//lang_chars
const characters = [
  {id: "qof", display_type: "text", display_value: "ק", tooltip: "Qof"},
{id: "resh", display_type: "text", display_value: "ר", tooltip: "Resh"},
{id: "alef", display_type: "text", display_value: "א", tooltip: "Alef"},
{id: "tet", display_type: "text", display_value: "ט", tooltip: "Tet"},
{id: "vav", display_type: "text", display_value: "ו", tooltip: "Vav"},
{id: "nunsofit", display_type: "text", display_value: "ן", tooltip: "Nun sofit"},
{id: "memsofit", display_type: "text", display_value: "ם", tooltip: "Mem"},
{id: "pay", display_type: "text", display_value: "פ", tooltip: "Pay"},
{id: "shin", display_type: "text", display_value: "ש", tooltip: "Shin"},
{id: "dalet", display_type: "text", display_value: "ד", tooltip: "Dalet"},
{id: "gimel", display_type: "text", display_value: "ג", tooltip: "Gimel"},
{id: "kaf", display_type: "text", display_value: "כ", tooltip: "Kaf"},
{id: "ayin", display_type: "text", display_value: "ע", tooltip: "Ayin"},
{id: "yod", display_type: "text", display_value: "י", tooltip: "Yod"},
{id: "chet", display_type: "text", display_value: "ח", tooltip: "Chet"},
{id: "lamed", display_type: "text", display_value: "ל", tooltip: "Lamed"},
{id: "kafsofit", display_type: "text", display_value: "ך", tooltip: "Kaf sofit"},
{id: "paysofit", display_type: "text", display_value: "ף", tooltip: "Pay sofit"},
{id: "zayin", display_type: "text", display_value: "ז", tooltip: "Zayin"},
{id: "samech", display_type: "text", display_value: "ס", tooltip: "Samech"},
{id: "bet", display_type: "text", display_value: "ב", tooltip: "Bet"},
{id: "he", display_type: "text", display_value: "ה", tooltip: "He"},
{id: "nun", display_type: "text", display_value: "נ", tooltip: "Nun"},
{id: "mem", display_type: "text", display_value: "מ", tooltip: "Mem"},
{id: "tsade", display_type: "text", display_value: "צ", tooltip: "Tsade"},
{id: "tav", display_type: "text", display_value: "ת", tooltip: "Tav"},
{id: "tsadesofit", display_type: "text", display_value: "ץ", tooltip: "Tsade sofit"},
{id: "sheva", display_type: "text", display_value: "ְ", tooltip: "Sheva"},
{id: "hataf_segol", display_type: "text", display_value: "ֱ", tooltip: "Hataf segol"},
{id: "hataf_patah", display_type: "text", display_value: "ֲ", tooltip: "Hataf patah"},
{id: "hataf_qamats", display_type: "text", display_value: "ֳ", tooltip: "Hataf qamats"},
{id: "hiriq", display_type: "text", display_value: "ִ", tooltip: "Hiriq"},
{id: "tsere", display_type: "text", display_value: "ֵ", tooltip: "Tsere"},
{id: "segol", display_type: "text", display_value: "ֶ", tooltip: "Segol"},
{id: "patah", display_type: "text", display_value: "ַ", tooltip: "Patah"},
{id: "qamats", display_type: "text", display_value: "ָ", tooltip: "Qamats"},
{id: "sin_dot", display_type: "text", display_value: "שׂ", tooltip: "Sin dot"},
{id: "shin_dot", display_type: "text", display_value: "שׁ", tooltip: "Shin dot"},
{id: "holam", display_type: "text", display_value: "ֹ", tooltip: "Holam"},
{id: "dagesh_or_mapiq", display_type: "text", display_value: "ּ", tooltip: "Dagesh or Mapiq"},
{id: "shuruk", display_type: "text", display_value: "וּ", tooltip: "Shuruk"},
{id: "qubuts", display_type: "text", display_value: "ֻ", tooltip: "Qubuts"},
{id: "sheqel", display_type: "text", display_value: "₪", tooltip: "Sheqel"},
{id: "copytoclipboard", display_type: "svg", display_value: "copyToClipboardSvg", action_type: "function", action_value: "onCopyToClipboard", tooltip: "Copy to clipboard"},
{id: "clearalltext", display_type: "svg", display_value: "clearAllTextSvg", action_type: "function", action_value: "onClearAllText", tooltip: "Clear all text"},
{id: "latin_small_a", display_type: "text", display_value: "A", tooltip: "Latin A"},
{id: "latin_small_b", display_type: "text", display_value: "B", tooltip: "Latin B"},
{id: "latin_small_c", display_type: "text", display_value: "C", tooltip: "Latin C"},
{id: "latin_small_d", display_type: "text", display_value: "D", tooltip: "Latin D"},
{id: "latin_small_e", display_type: "text", display_value: "E", tooltip: "Latin E"},
{id: "latin_small_f", display_type: "text", display_value: "F", tooltip: "Latin F"},
{id: "latin_small_g", display_type: "text", display_value: "G", tooltip: "Latin G"},
{id: "latin_small_h", display_type: "text", display_value: "H", tooltip: "Latin H"},
{id: "latin_small_i", display_type: "text", display_value: "I", tooltip: "Latin I"},
{id: "latin_small_j", display_type: "text", display_value: "J", tooltip: "Latin J"},
{id: "latin_small_k", display_type: "text", display_value: "K", tooltip: "Latin K"},
{id: "latin_small_l", display_type: "text", display_value: "L", tooltip: "Latin L"},
{id: "latin_small_m", display_type: "text", display_value: "M", tooltip: "Latin M"},
{id: "latin_small_n", display_type: "text", display_value: "N", tooltip: "Latin N"},
{id: "latin_small_o", display_type: "text", display_value: "O", tooltip: "Latin O"},
{id: "latin_small_p", display_type: "text", display_value: "P", tooltip: "Latin P"},
{id: "latin_small_q", display_type: "text", display_value: "Q", tooltip: "Latin Q"},
{id: "latin_small_r", display_type: "text", display_value: "R", tooltip: "Latin R"},
{id: "latin_small_s", display_type: "text", display_value: "S", tooltip: "Latin S"},
{id: "latin_small_t", display_type: "text", display_value: "T", tooltip: "Latin T"},
{id: "latin_small_u", display_type: "text", display_value: "U", tooltip: "Latin U"},
{id: "latin_small_v", display_type: "text", display_value: "V", tooltip: "Latin V"},
{id: "latin_small_w", display_type: "text", display_value: "W", tooltip: "Latin W"},
{id: "latin_small_x", display_type: "text", display_value: "X", tooltip: "Latin X"},
{id: "latin_small_y", display_type: "text", display_value: "Y", tooltip: "Latin Y"},
{id: "latin_small_z", display_type: "text", display_value: "Z", tooltip: "Latin Z"},
{id: "right_parenthesis", display_type: "text", display_value: ")", tooltip: "Right parenthesis"},
{id: "digit_zero", display_type: "text", display_value: "0", tooltip: "Digit zero"},
{id: "left_parenthesis", display_type: "text", display_value: "(", tooltip: "Left parenthesis"},
{id: "digit_nine", display_type: "text", display_value: "9", tooltip: "Digit nine"},
{id: "exclamation_mark", display_type: "text", display_value: "!", tooltip: "Exclamation mark"},
{id: "digit_one", display_type: "text", display_value: "1", tooltip: "Digit one"},
{id: "commercial_at", display_type: "text", display_value: "@", tooltip: "Commercial at"},
{id: "digit_two", display_type: "text", display_value: "2", tooltip: "Digit two"},
{id: "number_sign", display_type: "text", display_value: "#", tooltip: "Number sign"},
{id: "digit_three", display_type: "text", display_value: "3", tooltip: "Digit three"},
{id: "dollar_sign", display_type: "text", display_value: "$", tooltip: "Dollar sign"},
{id: "digit_four", display_type: "text", display_value: "4", tooltip: "Digit four"},
{id: "percent_sign", display_type: "text", display_value: "%", tooltip: "Percent sign"},
{id: "digit_five", display_type: "text", display_value: "5", tooltip: "Digit five"},
{id: "circumflex_accent", display_type: "text", display_value: "^", tooltip: "Circumflex accent"},
{id: "digit_six", display_type: "text", display_value: "6", tooltip: "Digit six"},
{id: "ampersand", display_type: "text", display_value: "&", tooltip: "Ampersand"},
{id: "digit_seven", display_type: "text", display_value: "7", tooltip: "Digit seven"},
{id: "asterisk", display_type: "text", display_value: "*", tooltip: "Asterisk"},
{id: "digit_eight", display_type: "text", display_value: "8", tooltip: "Digit eight"},
{id: "low_line", display_type: "text", display_value: "_", tooltip: "Low line"},
{id: "hyphen_minus", display_type: "text", display_value: "-", tooltip: "Hyphen minus"},
{id: "plus_sign", display_type: "text", display_value: "+", tooltip: "Plus sign"},
{id: "equals_sign", display_type: "text", display_value: "=", tooltip: "Equals sign"},
]

/* css used to position text on buttons
   primary key: name */

const keyslots = [
  {name: "main", css: {fontSize: "30px"}},
  {name: "main-med", css: {fontSize: "18px"}},
  {name: "shift", css: {fontSize: "18px"}},
  {name: "ref", css: {fontSize: "15px", position: "absolute", color: "#696969", top: "30px", left: "3px"}},
  {name: "alt", css: {fontSize: "15px", position: "absolute", color: "#696969", top: "30px", left: "38px"}},
  {name: "alt-niqqud", css: {fontSize: "32px", position: "absolute", color: "#696969", top: "7px", left: "32px"}},
  {name: "default", css: {}},
]

/* mapping of chars to keyboard keys
   primary key: name + language + keyCode + ctrlKey + shiftKey +  altKey +  metaKey */
//const hebrew_mac_standard_mapping = [
  
const keyboard_mapping = [
  {layout: "standard", language: "hebrew", charId: "copytoclipboard", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyQ", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "qof", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyE", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "resh", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyR", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "alef", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyT", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "tet", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyY", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "vav", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyU", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "shuruk", keyslot: "alt", keyslot_order: 4, keyboard: "macbookpro", keyCode: "KeyU", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "nunsofit", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyI", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "memsofit", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyO", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "pay", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyP", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "shin", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyA", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "sin_dot", keyslot: "alt", keyslot_order: 4, keyboard: "macbookpro", keyCode: "KeyA", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "dalet", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyS", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "gimel", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyD", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "kaf", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyF", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "ayin", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyG", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "yod", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyH", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "chet", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyJ", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "lamed", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyK", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "kafsofit", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyL", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "paysofit", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "Semicolon", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "zayin", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyZ", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "samech", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyX", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "bet", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyC", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "he", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyV", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "nun", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyB", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "mem", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyN", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "tsade", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "KeyM", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "shin_dot", keyslot: "alt", keyslot_order: 4, keyboard: "macbookpro", keyCode: "KeyM", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "tav", keyslot: "main", keyslot_order: 1, keyslot_ref: "ref", keyslot_ref_order: 3, keyboard: "macbookpro", keyCode: "Comma", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "dagesh_or_mapiq", keyslot: "alt-niqqud", keyslot_order: 4, keyboard: "macbookpro", keyCode: "Comma", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "tsadesofit", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Period", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "clearalltext", keyslot: "default", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Escape", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "right_parenthesis", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit0", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_zero", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit0", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "sheva", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit0", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "exclamation_mark", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit1", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_one", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit1", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "hataf_patah", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit1", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "commercial_at", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit2", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_two", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit2", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "hataf_qamats", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit2", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "number_sign", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit3", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_three", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit3", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "hataf_segol", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit3", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "dollar_sign", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit4", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_four", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit4", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "hiriq", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit4", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "percent_sign", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit5", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_five", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit5", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "tsere", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit5", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "circumflex_accent", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit6", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_six", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit6", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "patah", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit6", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "sheqel", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit7", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_seven", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit7", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "qamats", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit7", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "asterisk", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit8", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_eight", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit8", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "qubuts", keyslot: "alt-niqqud", keyslot_order: 3, keyboard: "macbookpro", keyCode: "Digit8", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "left_parenthesis", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Digit9", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "digit_nine", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Digit9", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "segol", keyslot: "alt-niqqud", keyslot_order: 4, keyboard: "macbookpro", keyCode: "Digit9", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "hebrew", charId: "low_line", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Minus", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "hyphen_minus", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Minus", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "plus_sign", keyslot: "shift", keyslot_order: 1, keyboard: "macbookpro", keyCode: "Equal", ctrlKey: false, shiftKey: true, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "equals_sign", keyslot: "main-med", keyslot_order: 2, keyboard: "macbookpro", keyCode: "Equal", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "hebrew", charId: "holam", keyslot: "alt-niqqud", keyslot_order: 4, keyboard: "macbookpro", keyCode: "Equal", ctrlKey: false, shiftKey: false, altKey: true, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_a", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyA", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_b", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyB", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_c", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyC", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_d", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyD", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_e", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyE", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_f", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyF", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_g", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyG", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_h", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyH", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_i", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyI", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_j", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyJ", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_k", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyK", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_l", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyL", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_m", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyM", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_n", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyN", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_o", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyO", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_p", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyP", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_q", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyQ", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_r", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyR", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_s", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyS", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_t", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyT", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_u", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyU", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_v", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyV", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_w", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyW", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_x", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyX", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_y", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyY", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
{layout: "standard", language: "english", charId: "latin_small_z", keyslot: "main", keyslot_order: 1, keyboard: "macbookpro", keyCode: "KeyZ", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false},
]