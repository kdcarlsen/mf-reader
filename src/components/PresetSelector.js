import React, {Component} from "react";
import "./PresetSelector.css";
import {inject, observer} from "mobx-react";
import {readPreset, sendPC, wait, WAIT_BETWEEN_MESSAGES} from "../utils/midi";
import {savePreferences} from "../utils/preferences";
import {readFile} from "../utils/files";
import {faPrint} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class PresetSelector extends Component {

    state = {
        direct_access: false,
        reading_all: false,
        abort_all: false,
        unread: true
    };

    constructor(props) {
        super(props);
        this.inputOpenFileRef = React.createRef();
    }

    toggleDirectAccess = () => {
        this.setState({direct_access: !this.state.direct_access})
    };

    change = (e) => {
        this.props.state.setPresetNumber(e.target.value);
        if (this.props.state.send_pc) {
            this.go();
        }
    };

    prev = () => {
        const n = this.props.state.preset_number - 1;
        // this.setPreset(n < 0 ? '255' : n.toString());
        this.props.state.setPresetNumber(n < 0 ? 511 : n);
        if (this.props.state.send_pc) {
            this.go();
        }
    };

    next = () => {
        const n = this.props.state.preset_number + 1;
        this.props.state.setPresetNumber(n > 511 ? 0 : n);
        if (this.props.state.send_pc) {
            this.go();
        }
    };

    go = () => {
        sendPC(this.props.state.preset_number);
    };

    selectDirect = (n) => {
        this.props.state.setPresetNumber(n);
        this.setState({direct_access: false});
        if (this.props.state.send_pc) {
            this.go();
        }
    };

    readSelected = async () => {
        if (!this.props.state.hasInputAndOutputEnabled()) {
            if (global.dev) console.log("readAllPresets: no output and/or input connected, ignore request");
            return;
        }
        this.props.state.error = 0;
        if (!await readPreset()) {
            if (global.dev) console.warn("read preset fail");
            this.props.state.error = 1;
        }
    };

    readAll = async (from=0, to=511, unread_only=false) => {

        if (!this.props.state.hasInputAndOutputEnabled()) {
            if (global.dev) console.log("readAllPresets: no output and/or input connected, ignore request");
            return;
        }

        this.props.state.error = 0;

        this.setState({reading_all: true});

        const S = this.props.state;

        for (let n = from; n <= to; n++) {
            if (this.state.abort_all) break;

            if (unread_only && (S.presets.length && (S.presets.length > n && S.presets[n]))) continue;

            if (! await readPreset(n)) {
                if (global.dev) console.warn("read preset fail");
                this.props.state.error = 1;
                break;
            }

            S.setPresetNumber(n);
            await wait(4 * WAIT_BETWEEN_MESSAGES);  // by updating the preset_number _after_ the reading, we avoid to display an empty preset while reading. This is much more pleasant.
        }

        this.setState({reading_all: false});
        this.setState({abort_all: false});
    };

    read1To512 = () => {
        this.readAll(0, 511, this.state.unread);
    };

    readNTo512 = () => {
        this.readAll((this.props.state.preset_number + 1) % 512, 512, this.state.unread);
    };



    abortAll = () => {
        this.setState({abort_all: true});
    };

    toggleSync = () => {
        this.props.state.send_pc = !this.props.state.send_pc;
        savePreferences({send_pc: this.props.state.send_pc});
    };

    toggleUnread = () => {
        this.setState({unread: !this.state.unread});
    };

    loadData = async e => {
        if (global.dev) console.log("load data", e.target.value);
        if (e.target.value) {
            let response = await fetch("data/" + e.target.value);
            this.props.state.presets = await response.json();
            this.props.state.checkAllPresets();
        }
    };

    onFileSelection = async e => {
        if (global.dev) console.log("onFileSelection");
        this.props.state.presets = await readFile(e.target.files[0]);
    };

    importFromFile = () => {
        if (global.dev) console.log("importFromFile");
        this.inputOpenFileRef.current.click()
    };

    exportAsFile = () => {

        let url = window.URL.createObjectURL(new Blob([JSON.stringify(this.props.state.presets)], {type: "application/json"}));

        let now = new Date();
        let timestamp =
            now.getUTCFullYear() + "-" +
            ("0" + (now.getUTCMonth() + 1)).slice(-2) + "-" +
            ("0" + now.getUTCDate()).slice(-2) + "-" +
            ("0" + now.getUTCHours()).slice(-2) + "" +
            ("0" + now.getUTCMinutes()).slice(-2) + "" +
            ("0" + now.getUTCSeconds()).slice(-2);
        let filename = 'microfreak-reader.' + timestamp;

        let shadowlink = document.createElement("a");
        shadowlink.download = filename + ".json";
        shadowlink.style.display = "none";
        shadowlink.href = url;

        document.body.appendChild(shadowlink);
        shadowlink.click();
        document.body.removeChild(shadowlink);

        setTimeout(function() {
            return window.URL.revokeObjectURL(url);
        }, 1000);
    };

    render() {

        const S = this.props.state;

        const midi_ok = S.hasInputEnabled() && S.hasOutputEnabled();

        const pc = [];
        const plength = S.presets.length;
        for (let i=0; i<512; i++) {
            let classname = i === S.preset_number ? 'sel' : '';
            if (plength && (plength > i && S.presets[i])) {
                classname += ' loaded';
            }
            pc.push(<div key={i} className={classname} onClick={() => this.selectDirect(i)}>{i+1}</div>);
        }

        let preset_to = S.preset_number + 2;
        if (preset_to > 512) preset_to = 1;

        return (
            <div className={`preset-selector ${midi_ok?'midi-ok':'midi-ko'}`}>
                <div>
                    <select className="preloader" onChange={this.loadData}>
                        <option value="">Packs...</option>
                        <option value="Factory_1-1.json">Factory 1.1</option>
                        <option value="Factory_2-0.json">Factory 2.0</option>
                        <option value="Naughty_Bass.json">Naughty Bass</option>
                        <option value="Plaisir_Pads.json">Plaisir Pads</option>
                        <option value="Tech_Loop.json">Tech Loop</option>
                        <option value="Arp_Monster.json">Arp Monster</option>
                    </select>
                    <input ref={this.inputOpenFileRef} type="file" style={{display:"none"}}  onChange={this.onFileSelection} />
                    <button type="button midi-ok" onClick={this.importFromFile}>Load file</button>
                    <button type="button midi-ok" onClick={this.exportAsFile}>Save to file</button>
                    <a href={"?list=1"} target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faPrint}/></a>
                </div>
                <div className="seq-access">
                    <input type="text" id="preset" name="preset" min="1" max="512" value={S.preset_number_string} onChange={this.change} />
                    <button onClick={this.prev} title="Previous">&lt;</button>
                    <button onClick={this.next} title="Next">&gt;</button>
                    <button onClick={this.toggleDirectAccess} title="Choose the preset number then send a PC message to the MF.">#...</button>
                    {!this.props.state.send_pc && <button className="button-midi" onClick={this.go} title="Send a PC message to the MicroFreak to select this preset on the MicroFreak itself.">send PC</button>}
                    <label title="Automatically sends a PC message to the MF on preset change." className="no-bold"><input type="checkbox" checked={this.props.state.send_pc} onChange={this.toggleSync}/>auto. send PC</label>
                    {/*<button type="button" onClick={this.getURL}>Get URL</button>*/}
                </div>
                <div className="actions">
                    <button className={midi_ok ? "button-midi read-button ok" : "button-midi read-button"} type="button" onClick={this.readSelected}>READ preset #{S.preset_number_string}</button>
                    {!this.state.reading_all && <button className="button-midi" onClick={this.read1To512} title="Read all">Read all</button>}
                    {/*{!this.state.reading_all && <button className="button-midi" onClick={this.readNTo512} title="Read all">Read {preset_to}..512</button>}*/}
                    {this.state.reading_all && <button className="button-midi abort" onClick={this.abortAll} title="Stop reading all">{this.state.abort_all ? "Stopping..." : "STOP"}</button>}
                    <label title="Only read unread presets" className="no-bold"><input type="checkbox" checked={this.state.unread} onChange={this.toggleUnread}/>only unread</label>
                </div>
                {this.state.direct_access && <div className="direct-access">{pc}</div>}
            </div>
        );
    }

}

export default inject('state')(observer(PresetSelector));