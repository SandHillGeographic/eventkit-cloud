import React, { Component } from 'react';
import PropTypes from 'prop-types';

export class DataPackTableRow extends Component {
    render() {
        const styles = {
            container: {
                display: 'flex',
                width: '100%',
                padding: '5px',
                ...this.props.containerStyle,
            },
            title: {
                display: 'flex',
                flex: '0 0 auto',
                width: '140px',
                backgroundColor: '#f8f8f8',
                padding: '10px',
                marginRight: '5px',
                ...this.props.titleStyle,
            },
            data: {
                display: 'flex',
                flex: '1 1 auto',
                backgroundColor: '#f8f8f8',
                color: '#8b9396',
                paddingRight: '10px',
                paddingBottom: '0px',
                paddingTop: '10px',
                paddingLeft: '10px',
                wordBreak: 'break-word',
                width: '100%',
                ...this.props.dataStyle,
            },
        };

        return (
            <div
                className="qa-DataPackTableRow"
                style={styles.container}
            >
                <div
                    style={styles.title}
                >
                    <strong>{this.props.title}</strong>
                </div>
                <div
                    style={styles.data}
                >

                        {this.props.data}

                </div>
            </div>
        );
    }
}

DataPackTableRow.defaultProps = {
    containerStyle: {},
    titleStyle: {},
    dataStyle: {},
};

DataPackTableRow.propTypes = {
    title: PropTypes.string.isRequired,
    data: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node,
        PropTypes.arrayOf(PropTypes.node),
    ]).isRequired,
    containerStyle: PropTypes.object,
    titleStyle: PropTypes.object,
    dataStyle: PropTypes.object,
};

export default DataPackTableRow;
