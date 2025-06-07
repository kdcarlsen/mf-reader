import React, {Component, Fragment} from "react";
import "./PresetsGrid.css";
import {inject, observer} from "mobx-react";
import {readPreset, sendPC} from "../utils/midi";

class PresetsGrid extends Component {

    constructor(props) {
        super(props);
        document.addEventListener('keydown', this.onKeyboardEvent, false);
        document.addEventListener('keyup', this.onKeyboardEvent, false);
        document.addEventListener('keypress', this.onKeyboardEvent, false);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onKeyboardEvent, false);
        document.removeEventListener('keyup', this.onKeyboardEvent, false);
        document.removeEventListener('keypress', this.onKeyboardEvent, false);
    }

    onKeyboardEvent = (e) => {

        const GRID_COLS = 8;

        const isEligibleEvent = e.target === document.body;

        if (!isEligibleEvent) {
            return false;
        }

        const k = e.type === 'keydown';
        const xy = this.props.position === 'presets-grid-bottom';

        //TODO: improve this code
        switch (e.keyCode) {
            case 33:        // PAGE-UP
                if (k) {
                    e.preventDefault();
                    //e.stopPropagation();
                    if (xy) {
                        this.prev(GRID_COLS);
                    } else {
                        this.prev();
                    }
                }
                break;
            case 37:        // LEFT
                if (k) {
                    e.preventDefault();
                    this.prev();
                }
                break;
            case 38:        // UP
                if (k) {
                    e.preventDefault();
                    if (xy) {
                        this.prev(GRID_COLS);
                    } else {
                        this.prev();
                    }
                }
                break;
            case 34:        // PAGE-DOWN
                if (k) {
                    e.preventDefault();
                    if (xy) {
                        this.next(GRID_COLS);
                    } else {
                        this.next();
                    }
                }
                break;
            case 39:        // RIGHT
                if (k) {
                    e.preventDefault();
                    // if (xy) {
                    //     this.next();
                    // } else {
                        this.next();
                    // }
                }
                break;
            case 40:        // DOWN
                if (k) {
                    e.preventDefault();
                    if (xy) {
                        this.next(GRID_COLS);
                    } else {
                        this.next();
                    }
                }
                break;
            default: break;
        }

        return false;
    };

    readSelected = async () => {
        this.props.state.error = 0;
        if (! await readPreset()) {
            if (global.dev) console.warn("read preset fail");
            this.props.state.error = 1;
        }
    };

    prev = (d = 1) => {
        const n = this.props.state.preset_number - d;
        this.props.state.setPresetNumber(n < 0 ? 255 : n);
        if (this.props.state.send_pc) {
            sendPC(this.props.state.preset_number);
        }
    };

    next = (d = 1) => {
        const n = this.props.state.preset_number + d;
        this.props.state.setPresetNumber(n > 255 ? 0 : n);
        if (this.props.state.send_pc) {
            sendPC(this.props.state.preset_number);
        }
    };

    selectPreset = n => {
        this.props.state.setPresetNumber(n);
        if (this.props.state.send_pc) {
            sendPC(this.props.state.preset_number);
        }
    };

    render() {

        const S = this.props.state;

        const pc = [];
        for (let i=0; i<512; i++) {

            let classname = i === S.preset_number ? 'sel' : '';
            if (S.presets.length && (S.presets.length > i && S.presets[i])) {
                classname += ' loaded';
            }
            pc.push(
                <div key={i} className={classname} onClick={() => this.selectPreset(i)}>
                    <div className="g-i">{i+1}</div>
                    <div className="g-n">{S.presetName(i)}</div>
                    <div className="g-c">{S.presetCat(i)}</div>
                </div>
            );
        }

        return (
            <Fragment>
                <div className="presets-grid">
                    {pc}
                </div>
            </Fragment>
        );
    }

}

export default inject('state')(observer(PresetsGrid));