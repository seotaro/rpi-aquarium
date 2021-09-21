import { useState, useEffect, Fragment } from 'react';
import Box from '@material-ui/core/Box';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles } from '@material-ui/core/styles';

import ReactLoading from 'react-loading';

import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import HighchartMore from 'highcharts/highcharts-more';
HighchartMore(Highcharts);

const SPAN_TYPE = {
  'hour': { title: '1時間' },
  'half-day': { title: '12時間' },
  'day': { title: '24時間' },
  'week': { title: '1週間' },
};

const SENSOR_TYPE = {
  'temperature': { title: '温度', unit: '℃' },
};

Highcharts.setOptions({
  lang: {
    decimalPoint: '.',
    thousandsSep: ',',
    numericSymbols: null,
  },
  time: {
    useUTC: false,
  }
});

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100vw',
    height: '100vh'
  },
  formControl: {
    margin: 10,
    display: "inline-block",
    minWidth: 70,
  },
  title: {
    margin: 15,
    display: "inline-block",
    minWidth: 100,
    fontSize: 28,
    fontWeight: 'bold',
  },
  loading: {
    position: 'absolute',
    top: 'calc(50% - 32px)',  // ローディング画像の中央に来るようオフセットする。
    left: 'calc(50% - 32px)', // ローディング画像の中央に来るようオフセットする。
  }
}));

function App() {
  const classes = useStyles();
  const [spanType, setSpanType] = useState('hour');
  const [sensorType, setSensorType] = useState(Object.keys(SENSOR_TYPE)[0]);
  const [devices, setDevices] = useState(null);
  const [deviceValues, setDeviceValues] = useState(null);
  const [chart, setChart] = useState(null);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const url = process.env.REACT_APP_API_URL;

      fetch(`${url}/devices`)
        .then(res => {
          return res.text();
        })
        .then(text => {
          return JSON.parse(text);
        })
        .then(devices => {
          for (const k in devices) {
            const device = devices[k];
            device.isShow = true;
          }
          setDevices(devices);
        })
        .catch((err) => {
          console.error(`${err}`);
        });
    })();
  }, []);


  useEffect(() => {
    setLoading(true);

    const url = `${process.env.REACT_APP_API_URL}/?span=${spanType}`;
    fetch(url)
      .then(res => {
        return res.text();
      })
      .then(text => {
        // 日時の文字列を Date オブジェクトにする。
        const reviver = ((key, value) => {
          return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(value) ? new Date(value) : value;
        });
        return JSON.parse(text, reviver);
      })
      .then(devices => {
        setDeviceValues(devices);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`${err}`);
        setLoading(false);
      });
  }, [devices, spanType]);

  useEffect(() => {
    const sensor = SENSOR_TYPE[sensorType];

    let series = [];
    switch (spanType) {
      case 'hour':
        for (const id in deviceValues) {
          const device = deviceValues[id];

          let data = [];
          device.forEach(values => {
            data.push([values.datetime.getTime(), values[sensorType]]);
          });

          series.push({
            type: 'line',
            name: devices[id].name,
            data: data,
            tooltip: {
              headerFormat: '{series.name}<br>',
              pointFormat: `{point.x:%Y/%m/%d %H:%M} <b>{point.y:.2f}</b> [${sensor.unit}]`
            },
          });
        };
        break;

      case 'half-day':
      case 'day':
      case 'week':
        for (const id in deviceValues) {
          const device = deviceValues[id];

          let lineData = [];
          let errorbarData = [];
          device.forEach(values => {
            if (values[sensorType] == null) {
              lineData.push([values.datetime.getTime(), null]);
              errorbarData.push([values.datetime.getTime(), null, null]);
            } else {
              lineData.push([values.datetime.getTime(), values[sensorType].average]);
              errorbarData.push([values.datetime.getTime(), values[sensorType].min, values[sensorType].max]);
            }
          });

          series.push({
            type: 'line',
            name: devices[id].name,
            data: lineData,
            tooltip: {
              headerFormat: '{series.name}<br>',
              pointFormat: `{point.x:%Y/%m/%d %H:%M} <b>average:{point.y:.2f}</b> [${sensor.unit}]`
            }
          });

          series.push({
            type: 'errorbar',
            name: devices[id].name,
            data: errorbarData,
            tooltip: {
              headerFormat: '{series.name}<br>',
              pointFormat: `{point.x:%Y/%m/%d %H:%M} <b> min:{point.low:.2f} max:{point.high:.2f}</b> [${sensor.unit}]`
            },
            color: '#888'
          });
        };
        break;

      default:
        break;
    }

    const options = {
      series: series,
      title: {
        text: '',
      },
      chart: {
        zoomType: 'x',
      },
      xAxis: {
        title: {
          text: 'Date'
        },
        type: 'datetime',
        minPadding: 0.1,
        maxPadding: 0,
        showLastLabel: true,
        dateTimeLabelFormats: {
          hour: '%H:00',
          day: '%m/%d',
          week: '%m/%d',
          month: '%Y/%m',
          year: '%Y',
        },
      },
      yAxis: {
        title: { text: `${sensor.title} [${sensor.unit}]` },
        opposite: true,
        offset: 0,
      },

      exporting: {
        enabled: false
      },
      plotOptions: {
        series: {
          animation: true,
        },
        area: {
          fillColor: false,
          lineWidth: 2,
          threshold: null
        }
      },
      scrollbar: {
        enabled: true
      },
      navigator: {
        enabled: false
      },
      rangeSelector: {
        enabled: false
      },
      legend: {
        enabled: true
      },
    }

    const chart = (<HighchartsReact
      highcharts={Highcharts}
      options={options}
    />);
    setChart(chart);
  }, [deviceValues]);

  return (
    <Fragment>
      <Box className={classes.title}>
        rpi aquarium
      </Box>
      <FormControl className={classes.formControl}>
        <InputLabel id="select-span-label">期間</InputLabel>
        <Select
          labelId="select-span-label"
          id="select-span"
          value={spanType}
          onChange={e => { setSpanType(e.target.value) }}
        >
          {Object.keys(SPAN_TYPE).map(x => <MenuItem key={x} value={x}>{SPAN_TYPE[x].title}</MenuItem>)}
        </Select>
      </FormControl>
      {chart}
      {isLoading ? <ReactLoading className={classes.loading} type={'spin'} color={"rgb(53, 126, 221)"} /> : null}
    </Fragment >
  );
}

export default App;
