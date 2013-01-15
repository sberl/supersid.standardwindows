#!/usr/bin/python
#-------------------------------------------------------------------------------
''' supersid.py  '''
''' version 1.2.1 '''
#-------------------------------------------------------------------------------

import pyaudio
import wave
import struct

import matplotlib
matplotlib.use('WXAgg') # select back-end before pylab
# FigureCanvas and Figure are the things of matplotlib (not wx)
from matplotlib.backends.backend_wxagg import FigureCanvasWxAgg as FigureCanvas
from matplotlib.mlab import movavg
from matplotlib.figure import Figure

import wx

import sys
import time
import calendar
from time import strftime

import pylab
from numpy import *
from scipy.signal import *
#from scipy.fftpack import fftshift
from math import sqrt
import ConfigParser
import os, os.path
import itertools

import supersid_plot as SSP
#import supersid_upload as SSU

#-------------------------------------------------------------------------------
# CONSTANTS:

FORMAT              = pyaudio.paInt16
ID_TIMER            = 100
ID_PLOT             = 101
ID_SAVE_SPECTRUM    = 102
ID_SAVE_BUFFERS     = 103
ID_EXIT             = 104
ID_ABOUT            = 105
ID_BUTTON           = 106
ID_SAVE_FILTERED    = 107

CODE_PATH_NAME   = "../Program/"
DATA_PATH_NAME   = "../Data/"
CONFIG_PATH_NAME = "../Config/"
DOC_PATH_NAME    = "../Doc/"

VERSION         = "1.2.1"

COLLECT_START   = "000000"

#-------------------------------------------------------------------------------

class Sampler():
    '''
    Sampler handles audio data capture, calculating PSD, extracting signal strengths at monitored frequencies,
    saving spectrum and spectrogram (image) to png file
    '''

    def __init__(self, parent, audio_sampling_rate = 96000, NFFT = 1024):
        self.parent = parent
        self.audio_sampling_rate = audio_sampling_rate
        self.NFFT = NFFT
        self.sampler_ok = True

        try:
            self.pa_lib = pyaudio.PyAudio()
            #for i in range(self.pa_lib.get_device_count()):
            #    print i, ":", self.pa_lib.get_device_info_by_index(i)
            #print "d :", self.pa_lib.get_default_input_device_info()
            self.pa_stream = self.pa_lib.open(format = FORMAT,
                                              channels = 1,
                                              rate = self.audio_sampling_rate,
                                              input = True,
                                              frames_per_buffer = self.audio_sampling_rate)
        except:
            self.sampler_ok = False
            self.display_error_message("Could not open PortAudio Stream")

        else:
            self.axes                    = parent.psd_frame.get_axes()
            self.canvas                  = parent.psd_frame.canvas
            self.site_name               = parent.config['site_name']
            self.monitored_bins          = []
            self.capture_time            = 0.0
            self.scaling_factor          = parent.config['scaling_factor']
            self.saving_spectrum_flag    = False
            self.saving_spectrogram_flag = False


    def set_monitored_frequencies(self, stations):
        self.monitored_bins = []
        for station in stations:
            binSample = int(round((station[Config.FREQUENCY] * float(self.NFFT)) / self.audio_sampling_rate))
            self.monitored_bins.append(binSample)
            #print "monitored freq =", freq, " => bin = ", bin

    def set_station_if(self, station_id='NONE'):
        self.station_id = station_id

    def set_saving_spectrum_flag(self):
        self.saving_spectrum_flag = True;

    def set_saving_spectrogram_flag(self):
        self.saving_spectrogram_flag = True;

    def set_scaling_factor(self, scaling_factor):
        self.scaling_factor = scaling_factor

    def capture_data(self):
        '''Synchronously read 1 second of data from audio port '''

        self.capture_time = time.time()
        #self.time_string = strftime("%Y-%m-%d %H:%M:%S")            # set time_string here (more accurate),
                                                                     # use local time (more convinient for user)
        try:
            raw_data = self.pa_stream.read(self.audio_sampling_rate)
        except:
            self.sampler_ok = False
            self.display_error_message("Fail to read data from PortAudio")
        else:
            self.data = array(struct.unpack("%ih"%(self.audio_sampling_rate), raw_data))

            #scale A/D raw_data to voltage here (we might substract 5v to make the data look more like SID)
            if(self.scaling_factor != 1.0):
                self.data = self.data * self.scaling_factor

    def update(self):
        '''
        Capture 1 second of data, calculate PSD, return signal strengths at interested freq bins
        If saving_spectrum_flag or saving_spectrogram_flag is set, save the png image
        Keep update() and capture_data() independent for calling from different sources (web)
        '''

        self.capture_data();
        if self.sampler_ok:
            Pxx, freqs = self.axes.psd(self.data, NFFT = self.NFFT, Fs=self.audio_sampling_rate)
            self.canvas.draw()       # without this call, psd plot is not visible

            signal_strengths = []
            for binSample in self.monitored_bins:
                signal_strengths.append(Pxx[binSample])
            return signal_strengths
        else:
            return []

    def create_spectrum_graph(self, filename=''):
        capture_data();
        cla()
        pylab.psd(self.data, NFFT=self.NFFT, Fs=self.audio_sampling_rate)

        title = 'VLF Spectrum   ' + self.site_name + strftime("  %Y-%m-%d %H:%M:%S", time.gmtime(self.capture_time))

        if filename == '':
            filename = DATA_PATH_NAME + 'spectrum_' + self.site_name + strftime(" %Y-%m-%d_%H-%M-%S", time.gmtime(self.capture_time)) + ".png"
        pylab.savefig(filename)


    def create_spectrogram_graph(self, filename = ''):
        raw_data = capture_data();
        cla()
        pylab.specgram(raw_data, NFFT=self.NFFT, Fs=self.audio_sampling_rate, detrend=mlab.detrend_none,
                 window = mlab.window_hanning, cmap=None, xextent=None)

        title = 'VLF Spectrogram   ' + self.site_name + strftime("  %Y-%m-%d %H:%M:%S", time.gmtime(self.capture_time))

        if filename == '':
            filename = DATA_PATH_NAME + 'spectrogram_' + self.site_name + strftime(" %Y-%m-%d_%H-%M-%S", time.gmtime(self.capture_time)) + ".png"
        pylab.savefig(filename)

    def close(self):
        self.pa_stream.close()
        self.pa_lib.terminate()

    def display_error_message(self, message):
        wx.MessageBox(message + ". Please check.","Sampler")
        self.sampler_ok = False
        return

#-------------------------------------------------------------------------------

class Station:
    '''
    Station maintains a circular buffer, storing the signal strength durring 24 hours.
    The buffer starts at UTC 00:00:00 today.
    The data return can be optional shifted (by time zone offset) to display in local time
    This data buffer should be filtered with "bema_filter" (bottom_envelop_moving_average)
    to remove the interference energy (which always added) before ploting or saving into file.
    The filtered signal is more acurately representing the VLF signal strength variation caused by SID events.
    '''

    def __init__(self, call_sign, frequency, graph_color='b', data_interval=5, bema_wing =6):

        self.call_sign     = call_sign
        self.frequency     = frequency
        self.graph_color   = graph_color # (b,g,r,c,m,y,k,w)
        self.data_interval = data_interval
        self.bema_wing     = bema_wing
        self.buffer_size   = 24*60*60/self.data_interval
        # lie for debugging
        # self.buffer_size   = 1*60*6/self.data_interval
        self.raw_buffer    = zeros(self.buffer_size)
        #print "Interval", self.data_interval, "Buffer Size: ", self.buffer_size

    def update_data_point(self, index, value):
        #print "update" , index,"  ", value
        #if index >= 0 and index < self.buffer_size:
        try:
            self.raw_buffer[index] = value
            if self.raw_buffer[index-1] == 0.0:    # rare case where an timer event has been lost
                self.raw_buffer[index-1] = value
        except IndexError as eIE:
            pass

    def clear_data_buffer(self):
        self.raw_buffer = zeros(self.buffer_size)

    def gen_sim_data(self, sim_type = 'SINE'):
        ''' Generate 24 hours of data for testings bema filter, ploter, logger '''

        a = arange(0, 24*60*60/self.data_interval)

        if (sim_type == 'SINE'):
            for i in a:
                self.raw_buffer[i] = 100 + 100*sin(i/720) + random()

        if (sim_type == 'RAMP'):
            for i in a:
                self.raw_buffer[i] = i

        if (sim_type == 'STEP'):
            value = 10
            hour_block = 60 * int(60 / self.data_interval)
            for i in a:
                if (i % hour_block == 0):
                    value += 10
                self.raw_buffer[i] = value

    def get_raw_buffer(self):
        return self.raw_buffer

    def get_buffer(self, gmt_offset = 0):
        '''
        Return bema filterred version of the buffer, with optional time_zone_offset.
        bema filter uses the minimal found value to represent the data points within a range (bema_window)
        bema_wing = 6 => window = 13 (bema_wing + evaluating point + bema_wing)
        '''

        length = self.buffer_size #len(self.raw_buffer)

        # Extend 2 wings to the raw data buffer before taking min and average
        dstack = hstack((self.raw_buffer[length-self.bema_wing:length],\
                      self.raw_buffer[0:length],\
                      self.raw_buffer[0:self.bema_wing]))

        # Fill the 2 wings with the values at the edge
        for i in range(0, self.bema_wing):
            dstack[i] = dstack[self.bema_wing]
        for i in range(length+self.bema_wing, length+self.bema_wing*2):
            dstack[i] = dstack[length+self.bema_wing-1]

        dmin = zeros(len(dstack))

        # Use the lowest point found in window to represent its value
        for i in range(self.bema_wing, length+self.bema_wing):
            dmin[i] = min(dstack[i-self.bema_wing:i+self.bema_wing])

        # The points beyond the left edge, set to the starting point value
        for i in range (0, self.bema_wing):
            dmin[i] = dmin[self.bema_wing];

        # The points beyond the right edge, set to the ending point value
        for i in range (length+self.bema_wing, length+self.bema_wing*2):
            dmin[i] = dmin[length+self.bema_wing-1];

        # Moving Average. This actually truncates array to original size
        daverage = movavg(dmin, (self.bema_wing*2+1))

        if gmt_offset == 0:
            return daverage
        else:
            gmt_mark = gmt_offset * (60/self.data_interval) * 60
            doffset = hstack((daverage[gmt_mark:length],daverage[0:gmt_mark]))
            return doffset

    def print_buffers(self, from_index, to_index):
        ''' For debug, print both raw and bema buffers for comparision'''
        bema_buffer = self.get_buffer()
        for i in range (from_index, to_index):
            print '%d %f %f' % (i, self.raw_buffer[i], bema_buffer[i])


#-------------------------------------------------------------------------------

class PSD_Frame(wx.Frame):
    '''
    In Control-Modole-View pattern,
       PSD_Frame is the VIEW, for displaying VLF spectrum
       PSD_Frame is also the CONTROL,
       which has the wxTimer and GUI handlers (on_timer, on_close, on_click...)
    Frame, Menu, Panel, BoxSizer are wx things and FigureCanvas, Figure, Axes are MPL things
    PSD_Frame =>> Panel =>> FigureCanvas =>> Figure => Axes
    wxTimer and frame close events are forwarded to SuperSID class
    '''

    def __init__(self, parent):
        #self.config     = config    # to keep config info
        self.parent     = parent    # to call back on wx Timer event
        self.interval   = 5000

        # Frame
        wx.Frame.__init__(self, None, -1, "supersid", pos = (20, 20), size=(1000,400))
        self.Bind(wx.EVT_CLOSE, self.on_close)

        # Icon
        try:
            self.SetIcon(wx.Icon("supersid_icon.png", wx.BITMAP_TYPE_PNG))
        finally:
            pass

        # Menu
        menu_item_file = wx.Menu()
        #menu_item_file.Append(ID_SAVE_SPECTRUM, '&Save Spectrum\tCtrl+S', 'Save Spectrum') # not now, this interferes with Timer loop
        menu_item_file.Append(ID_SAVE_BUFFERS, '&Save Raw Buffers\tCtrl+B', 'Save Raw Buffers')
        menu_item_file.Append(ID_SAVE_FILTERED, '&Save Filtered Buffers\tCtrl+F', 'Save Filtered Buffers')
        menu_item_file.Append(ID_EXIT, '&Quit\tCtrl+Q', 'Quit Super SID')

        menu_item_plot = wx.Menu()
        menu_item_plot.Append(ID_PLOT, '&Plot\tCtrl+P', 'Plot data')

        menu_item_help = wx.Menu()
        menu_item_help.Append(ID_ABOUT, '&About', 'About Super SID')

        menubar = wx.MenuBar()
        menubar.Append(menu_item_file, '&File')
        menubar.Append(menu_item_plot, '&Plot')
        menubar.Append(menu_item_help, '&Help')

        self.SetMenuBar(menubar)
        #self.Bind(wx.EVT_BUTTON, self.OnLaunchCommandOk, id=ID_BUTTON)
        #self.Bind(wx.EVT_MENU, self.on_save_spectrum, id=ID_SAVE_SPECTRUM) # not now
        self.Bind(wx.EVT_MENU, self.on_save_buffers, id=ID_SAVE_BUFFERS)
        self.Bind(wx.EVT_MENU, self.on_save_filtered, id=ID_SAVE_FILTERED)
        self.Bind(wx.EVT_MENU, self.on_plot, id=ID_PLOT)
        self.Bind(wx.EVT_MENU, self.on_about, id=ID_ABOUT)
        self.Bind(wx.EVT_MENU, self.on_exit, id=ID_EXIT)
        '''self.Bind(wx.EVT_TIMER, self.on_timer, id=ID_TIMER)'''

        # Frame
        psd_panel = wx.Panel(self, -1)
        psd_sizer = wx.BoxSizer(wx.VERTICAL)
        psd_panel.SetSizer(psd_sizer)

        # FigureCanvas
        psd_figure = Figure(facecolor='beige')# 'bisque' 'antiquewhite' 'FFE4C4' 'F5F5DC' 'grey'
        self.canvas = FigureCanvas(psd_panel, -1, psd_figure)
        self.canvas.mpl_connect('button_press_event', self.on_click) # MPL call back

        psd_sizer.Add(self.canvas, 1, wx.EXPAND)
        self.axes = psd_figure.add_subplot(111)
        #self.axes.set_xlabel('Frequency')
        #self.axes.set_ylabel('Power', multialignment='center')

        #mpl.rcParams['lines.linewidth'] = 1
        #mpl.rcParams['lines.color'] = 'r'
        #mpl.rcParams['figure.subplot.left'] = 0.2
        #mpl.rcParams['figure.subplot.right'] = 0.1
        #mpl.rcParams['figure.subplot.top'] = 0.1
        #mpl.rcParams['figure.subplot.bottom'] = 0.3

        self.axes.hold(True)

        # StatusBar
        self.status_bar = self.CreateStatusBar()
        self.status_bar.SetFieldsCount(2)

        # Default View
        self.SetMinSize((600,400))
        psd_sizer.SetItemMinSize(psd_panel,1000,400)
        self.Center(True)
        #self.plot_test_data() # testing

        # Init done
        self.Show(True)
        self.status_display("Reading supersid.cfg ...")
        self.timer = 0

    def create_timer(self):
        self.SetTitle("supersid." + VERSION + "@" + self.parent.config['site_name']) # nice to have site_name in view

        self.timer = wx.Timer(self, 1)
        wx.EVT_TIMER(self, 1, self.on_timer)
        self.interval = 1000 * self.parent.config['log_interval']
        self.status_display("Waiting for Timer ... ")

    def shut_down(self):
        self.stop_timer()
        self.Destroy()
        self.parent.on_close()   # pass to parent, too

    def get_axes(self):
        return self.axes

    def plot_test_data(self):
        t = arange(0.0, 10, 0.01)
        s = sin(2*pi*t)
        self.axes.plot(t,s)

    def status_display(self, message, field=0):
        self.status_bar.SetStatusText(message,field)

    def set_timer_interval(self, interval):
        self.interval = interval * 1000

    def start_timer(self):
        self.timer.Start(self.interval)

    def stop_timer(self):
        if(self.timer):
            self.timer.Stop()

        #try
        #    self.timer
        #except NameError:
        #    return # not yet created
        #else:
        #    self.timer.Stop()

    def on_timer(self, event):
        #self.canvas.draw()       # without this call, psd plot is not visible, do this in sampler now
        self.parent.on_timer()   # pass to parent

    def on_close(self, event):
        self.stop_timer()
        self.Destroy()
        self.parent.on_close()   # pass to parent

    def on_exit(self, event):
        self.status_display("This is supersid signing off...")
        dlg = wx.MessageDialog(self,
                            'Are you sure to quit supersid?', 'Please Confirm',
                            wx.YES_NO | wx.NO_DEFAULT | wx.ICON_QUESTION)
        if dlg.ShowModal() == wx.ID_YES:
            dlg = wx.MessageDialog(self,
                            'Want to save current data?', 'Please Confirm',
                            wx.YES_NO | wx.NO_DEFAULT | wx.ICON_QUESTION)
            if dlg.ShowModal() == wx.ID_YES:
                self.parent.save_current_buffers(self.parent.config['log_type'])
            self.stop_timer()
            self.Close(True)
            self.parent.on_close()   # pass to parent

    def on_plot(self, event):
        # Select a sigle file
        #filename = wx.FileSelector(message=wx.FileSelectorPromptStr,
        #                         default_path=DATA_PATH_NAME,
        #                         default_filename='*.csv',
        #                         default_extension='*.csv',
        #                         wildcard=wx.FileSelectorDefaultWildcardStr,
        #                         flags=0,
        #                         parent=None,
        #                         x=-1,
        #                         y=-1)

        # Select multiple files
        filedialog = wx.FileDialog(self, message = 'Choose files to plot',
                                   defaultDir = DATA_PATH_NAME,
                                   defaultFile = '',
                                   wildcard = 'Supported filetypes (*.csv) |*.csv',
                                   style = wx.OPEN |wx.FD_MULTIPLE)

        if filedialog.ShowModal() == wx.ID_OK:
            filelist = ""
            for u_filename in filedialog.GetFilenames():
                filelist = str(filelist + DATA_PATH_NAME + str(u_filename) + ",")

            filelist = filelist.rstrip(',') # remove last comma

            ssp = SSP.SUPERSID_PLOT()
            ssp.plot_filelist(filelist)

        return

    def on_save_spectrum(self, event):
        #print "on save spectrum"
        #self.parent.sampler.save_current_spectrum()
        return

    def on_save_buffers(self, event):
        ''' Intentionally put in exactly 1 "_" for later interpretation as supersid format'''
        self.parent.save_current_buffers(log_type='raw')

    def on_save_filtered(self, event):
        ''' Intentionally put in exactly 1 "_" for later interpretation as supersid format'''
        self.parent.save_current_buffers('current_filtered.csv', 'filtered')

    def on_about(self, event):
        '''
        self.status_display("On About()");
        dlg = wx.MessageDialog(self, 'super_sid\t\n' '2008\t', 'About',
                               wx.OK | wx.ICON_INFORMATION)
        dlg.ShowModal()
        dlg.Destroy()
        '''
        # About
        #AboutDialogBox(None, -1, 'About dialog box')
        description = """ This program is designed to detect Sudden Ionosphere Disturbances,
 which are caused by a blast of intense X-ray radiation,
 when there is a Solar Flare on the Sun.
"""

        info = wx.AboutDialogInfo()
        info.SetIcon(wx.Icon('logo.png', wx.BITMAP_TYPE_PNG))
        info.SetName('SuperSID')
        info.SetVersion(VERSION)
        info.SetDescription(description)
        info.SetCopyright('(C) 2008-2012 - Stanford Solar Center')

        about = wx.AboutBox(info)

        #AboutDialogBox(None, -1, 'About dialog box')

    def on_click(self, event): # MLP mouse event
        if event.inaxes:
            strength = pow(10, (event.ydata/10.0))
            message = "frequency=%.0f  " % event.xdata + " power=%.3f  " % event.ydata  + " strength=%.0f" % strength
            self.status_display(message,1)

    # For later use, with more general format
    def display_message(self, message="message...", sender="SuperSID"):

        status = wx.MessageBox(message,
                              sender,
                              wx.CANCEL | wx.YES_NO | wx.ICON_QUESTION)
        if status == wx.YES:
            return 1 #RETRY
        elif status == wx.NO:
            return 1 #SKIP
        elif status == wx.CANCEL:
            return 1 #STOP
        else:
            raise AssertionError(status)


#-------------------------------------------------------------------------------
#-------------------------------------------------------------------------------

class Logger():
    '''
    Log Station data into 2 different formats: sid_format (single column with time), supersid (multiple columns without time),
    Use ISO 8601 time stamp format "2008-10-31T09:09:09Z" or "20081031T090900Z"

    "20090621T0545Z" uses the basic formats [YYYY][MM][DD]T[hh][mm]Z.

    iso_time = time.strftime("%Y-%m-%dT%H:%M:%S", tuple_time)
    tuple_time = time.strptime(iso_time.replace("-", ""), "%Y%m%dT%H:%M:%S")
    print xml.utils.iso8601.tostring(time.time()) # returns "2004-04-10T04:44:08.19Z"
    date_start_epoch: 1225497600  = Sat, 01 Nov 2008 00:00:00 GMT
    '''
    def __init__(self, config):
        self.config = config

    def log_header_config(self, log_file, log_type, date_begin_epoch):
        """Ensure the same header on both formats."""
        print >> log_file, "# Site = " + self.config['site_name']
        if self.config['contact'] != '':
            print >> log_file, "# Contact = " + self.config['contact']
        print >> log_file, "# Longitude = " + self.config['longitude']
        print >> log_file, "# Latitude = " + self.config['latitude']
        print >> log_file, "#"
        #print >> log_file, "# UTC_Offset = " + str(utc_offset)         # calculated
        print >> log_file, "# UTC_Offset = " + self.config['utc_offset']   # from config file
        print >> log_file, "# TimeZone = " + self.config['time_zone']      # lookup
        print >> log_file, "#"
        print >> log_file, "# UTC_StartTime = " + strftime("%Y-%m-%d %H:%M:%S", time.gmtime(date_begin_epoch))
        print >> log_file, "# LogInterval = " , self.config['log_interval']
        print >> log_file, "# LogType = " , log_type
        print >> log_file, "# MonitorID = " + self.config['monitor_id']

    def log_sid_format(self, stations, date_begin_epoch, filename='', log_type='filtered'):
        """ One file per station. By default, buffered data is filtered."""
        for station in stations:
            if log_type == 'raw':
                data = station.get_raw_buffer();
            else:  # 'filtered' is default
                data = station.get_buffer();

            my_filename = filename if filename != '' \
                else self.config['site_name'] + "_" + station.call_sign + strftime("_%Y-%m-%d_",time.gmtime(date_begin_epoch)) + COLLECT_START + ".csv"

            with open(DATA_PATH_NAME + my_filename, "wt") as log_file:
                # Write header
                self.log_header_config(log_file, log_type, date_begin_epoch)
                print >> log_file, "# StationID = " + station.call_sign
                print >> log_file, "# Frequency = " + str(station.frequency)

                # Write data
                epoc = date_begin_epoch
                for d in data:
                    print >> log_file, strftime("%Y-%m-%d %H:%M:%S, ", time.gmtime(epoc))+ str(d)
                    epoc += self.config['log_interval']

    def log_supersid_format(self, stations, date_begin_epoch, filename='', log_type='filtered'):
        """Cascade all buffers in one file."""
        data = []
        for station in stations:
            if log_type == 'raw':
                data.append(station.get_raw_buffer());
            else: # 'filtered' default
                data.append(station.get_buffer());

        if filename == '':
            filename = self.config['site_name'] + strftime("_%Y-%m-%d_", time.gmtime(date_begin_epoch)) + COLLECT_START + ".csv"

        with open(DATA_PATH_NAME + filename, "wt") as log_file:
            # Write header
            self.log_header_config(log_file, log_type, date_begin_epoch)
            print >> log_file, "# Stations = " + ",".join([st.call_sign for st in stations])
            print >> log_file, "# Frequencies = " + ",".join([str(st.frequency) for st in stations])

            # Write data - note: izip instead of zip for better perfomance
            for dataRow in itertools.izip(*data):
                print >> log_file, ",".join([str(d) for d in dataRow])

#-------------------------------------------------------------------------------

class Config(dict):

    '''
    Config parses this format

    [PARAMETERS]
    site_name = WSO
    longitude = -122.17
    latitude = 37.41
    utc_offset = -08:00
    time_zone = Pacific Standard Time
    monitor_id = SV-1001

    audio_sampling_rate = 96000
    log_interval = 5
    log_format = sid_format (default) or supersid_format
    log_type = filtered (default) or raw
    plot_offset = 0

    automatic_upload = yes
    ftp_server = sid-ftp.stanford.edu
    ftp_directory = /incoming/TEST/

    number_of_stations = 5

    [STATION_1]
    call_sign = NAA
    color = r
    frequency = 24000

    [STATION_2]
    call_sign = NLK
    color = g
    frequency = 24800

    ...

    To acces, use
      - for parameters: config['site_name'], config['longitude'], etc...
      - for stations:   config.stations[i] is a triplet: (call_sign, frequency, color)
    Note: len(config.stations) == config['number_of_stations'] - sanity check -
    '''
    # constant to access the triplet's attribute of a station as st[Config.CALL_SIGN]
    CALL_SIGN = 0
    FREQUENCY = 1
    COLOR = 2

    def __init__(self, filename="supersid.cfg"):
        dict.__init__(self)  # Config object are now dictionnaries
        self.config_ok = True
        config_parser = ConfigParser.ConfigParser()
        rtn = config_parser.read([CONFIG_PATH_NAME + filename,
                                  os.path.expanduser(os.path.join('~', filename))])
        if len(rtn) == 0:
            wx.MessageBox("Cannot find configuration file: " + filename)
            self.config_ok = False
            return

        section = 'PARAMETERS'

        # Optional parameters
        for optionalParam in ('contact', # email
                              'hourly_save', # new flag: yes/no to save every hours
                              'data_path',    # new: to override DATA_PATH_NAME by user
                              'log_format'
                              ):
            try:
                self[optionalParam] = config_parser.get(section, optionalParam)
            except:
                self[optionalParam] = ''

        # log_format = sid_format or supersid_format => defaulted to 'sid_format'
        self['log_format'] = 'sid_format'

        # Required/mandatory parameters
        try:
            # Mandatory string parameters
            for mandatoryParam in ('site_name', 'longitude', 'latitude',
                                   'utc_offset', 'time_zone', 'monitor_id',
                                   'log_type', # 'filtered' or 'raw'
                                   'automatic_upload', 'ftp_server',
                                   'ftp_directory'):
                self[mandatoryParam] = config_parser.get(section, mandatoryParam)

            # Mandatory int parameters
            for mandatoryParam in ('audio_sampling_rate', 'log_interval', 'number_of_stations'):
                self[mandatoryParam] = int(config_parser.get(section, mandatoryParam))

            # Mandatory double parameters
            for mandatoryParam in ('scaling_factor',):
                self[mandatoryParam] = double(config_parser.get(section, mandatoryParam))

        except:
            wx.MessageBox("'"+mandatoryParam+"' is not found in 'supersid.cfg'. Please check.","supersid.cfg")
            self.config_ok = False
            return

        # Post parameters reading controls:
        if self['log_interval'] < 2:
            wx.MessageBox("'log_interval' < 2. Too fast! Please increase.","supersid.cfg")
            self.config_ok = False
            return

        if self['log_format'] not in ('sid_format','supersid_format'):
            wx.MessageBox("'log_format' must be either 'sid_format' or 'supersid_format'.","supersid.cfg")
            self.config_ok = False
            return

        if self['data_path'] != "":
            data_path = os.path.normpath(self['data_path']) + os.sep
            global DATA_PATH_NAME
            DATA_PATH_NAME = data_path
            if not os.path.isdir(data_path):
                wx.MessageBox("Unusable 'data_path' directory (" + DATA_PATH_NAME + ")",
                                                                "supersid.cfg")
                self.config_ok = False
                return

        # Just one choice: 'plot_offset = 0', for now ; not in the expected parameters list
        self['plot_offset'] = 0

        # Getting the stations parameters
        self.stations = []          # now defined as a list of triplets

        for i in range(self['number_of_stations']):
            section = "STATION_" + str(i+1)
            tmpDic = {}
            try:
                for parameter in ('call_sign', 'frequency', 'color'):
                    tmpDic[parameter] = config_parser.get(section, parameter)
                self.stations.append( (tmpDic['call_sign'], int(tmpDic['frequency']), tmpDic['color']) ) # triplet
            except:
                wx.MessageBox(section + " does not have the 3 expected parameters in supersid.cfg. Please check.",
                                                    "supersid.cfg")
                self.config_ok = False
                return

        # sanity check: as many Stations were read as announced by 'number_of_stations' (now section independant)
        if self['number_of_stations'] != len(self.stations):
            wx.MessageBox("'number_of_stations' does not match STATIONS found in supersid.cfg. Please check.",
                                                "supersid.cfg")
            self.config_ok = False
            return

        # log_type must be lower case and one of 'filtered' or 'raw'
        self['log_type'] = self['log_type'].lower()
        if self['log_type'] not in ('filtered', 'raw'):
            wx.MessageBox("'log_type' must be either 'filtered' or 'raw' in supersid.cfg. Please check.",
                                                "supersid.cfg")
            self.config_ok = False
            return


#-------------------------------------------------------------------------------

class SuperSID():
    '''
    This is the main class which creates all other objects.
    In CMV pattern, this is the Model holding all the data.
    The Timer and Close events from wx will be routed to handle here.
    Date_begin_epoch and buffer index are maintain, here.
    '''

    def __init__(self):
        self.sampler = 0
        #self.counts = 0 # only for short upload testing

        # Create GUI Frame to display real-time VLF Spectrum
        self.psd_frame = PSD_Frame(self)
        self.psd_axes = self.psd_frame.get_axes()

        # Read Config file here,  after create Frame (in order to display error messages)
        self.psd_frame.status_display("Reading supersid.cfg ...")
        self.config = Config("supersid.cfg")
        if not self.config.config_ok:
            self.psd_frame.shut_down()
            return

        # Set Stations' buffer_size
        self.buffer_size = (int) (24*60*60 / self.config['log_interval'])
        # lie for debugging
        # self.buffer_size = (int) (1*60*6 / self.config['log_interval'])
        # print "conf log interval: ", self.config['log_interval'], "Buf siz: ", self.buffer_size

        # Set Today begin epoch
        ttime = time.time()
        now = time.gmtime(ttime)
        global COLLECT_START
        COLLECT_START = strftime("%H0000", time.gmtime(ttime))
        self.date_begin_epoch = calendar.timegm((now[0], now[1], now[2], 0, 0, 0, now[6], now[7], now[8]))
        # print "data_begin_epoc ", strftime("%Y-%m-%d %H:%M:%S", time.gmtime(self.date_begin_epoch))
        #self.time_to_index = 1.0 / self.config['log_interval']

        # Create Sampler to collect audio buffer and portaudio library calls
        self.sampler = Sampler(self, audio_sampling_rate = self.config['audio_sampling_rate'], NFFT = 1024);
        if not self.sampler.sampler_ok:
            self.psd_frame.shut_down()
            return

        self.sampler.set_monitored_frequencies(self.config.stations);

        # Create Stations to hold the 24 hours circular buffers
        self.stations = []
        for call_sign, frequency, color in self.config.stations:
            self.stations.append( Station(call_sign, frequency, color,
                                            self.config['log_interval']))

        # Create Logger
        self.logger = Logger(self.config)

        # Timer
        self.psd_frame.create_timer()

        # Wait for Timer and trying to lock to a beginning of a log_interval
        while True:
            if (int (time.time() - self.date_begin_epoch)) % self.config['log_interval'] != 0:
                break;
            time.sleep(0.05);

        while True:
            if (int (time.time() - self.date_begin_epoch)) % self.config['log_interval'] == 0:
                break;
            time.sleep(0.05);

        # Set current index and start timer
        self.current_index = int ((time.time() - self.date_begin_epoch) / self.config['log_interval'])
        # lie for debugging
        # self.current_index = 6
        self.psd_frame.start_timer()


    def clear_all_data_buffers(self):
        for station in self.stations:
            station.clear_data_buffer()

    def on_timer(self):

        # self.current_index is the position in the buffer calculated from starting time
        # self.current_index = int ((time.time() - self.date_begin_epoch + 1.0) / self.config['log_interval'])

        # Get new data
        self.psd_axes.cla()
        signal_strengths = self.sampler.update()  # return a list of 1 second signal strength

        # Save signal strengths into buffers
        for station, strength in zip(self.stations, signal_strengths):
            station.update_data_point(self.current_index, strength)

        # Display on status bar
        message = strftime("%Y-%m-%d %H:%M:%S",time.gmtime(time.time()))
        message += "  [%d]  " % self.current_index

        for station, strength in zip(self.stations, signal_strengths):
            message +=  station.call_sign + "=%.1f " % strength

        self.psd_frame.status_display(message)

        # Calculate current_index for next on_timer event
        # i.e. next data acquisition
        self.current_index += 1

        # When hitting the buffer limit, clear buffers, reset index, set to next date' epoch
        if(self.current_index == self.buffer_size - 1):
            self.log_buffers(log_type = self.config['log_type'])  # as per user's choice in supersid.cfg

            # Restart a new day
            self.clear_all_data_buffers()
            self.current_index = 0

            self.date_begin_epoch += 24*60*60
            # lie for debugging
            # self.date_begin_epoch += 1*60*6
            global COLLECT_START
            COLLECT_START = "000000"
            # print "new day" + COLLECT_START

        elif self.config['hourly_save'].upper() == 'YES': # save raw buffers 'on the hour'
            # lie for debugging
            # if (self.current_index * self.config['log_interval']) % 60 == 0:
            if (self.current_index * self.config['log_interval']) % 3600 == 0:
                # print "Hourly save" + COLLECT_START
                fileName = "hourly_current_buffers_" + self.config['log_type'] + ".csv"
                self.save_current_buffers(fileName, self.config['log_type'])


    def log_buffers(self, filename='', log_type='filtered'):
        ''' log choices: sid_format (default) or supersid_format  raw or filtered (default) '''
        ''' If this file saving take took long, move to external call'''

        if(self.config['log_format'] == 'sid_format'):
            self.logger.log_sid_format(self.stations, self.date_begin_epoch, filename, log_type)
        else: # 'supersid_format' default
            self.logger.log_supersid_format(self.stations, self.date_begin_epoch, filename, log_type)

        # Pass today_file_list to supersid_upload
        #ssu = SSU.SUPERSID_UPLOAD()
        #ssu.upload(self.logger.today_file_list)

        # To add random sleep delay to supersid_update, spawn this code to external process
        #os.spawnv(os.P_NOWAIT, r'C:\Python27\python', ('python', 'supersid_upload.py')) # works,too
        # and it is better as it is not Windows dependent.... Below code shall be replace later
        if (self.config['automatic_upload'].upper() == 'YES'):
            os.startfile("supersid_upload.exe")

    def save_current_buffers(self, filename="current_buffers.csv", log_type='raw', log_format = 'both'):
        ''' Save raw data as supersid_format '''
        if log_format in ('both', 'sid_format'):
            self.logger.log_sid_format(self.stations, self.date_begin_epoch, '', log_type) # filename is '' to ensure one file per station
        if log_format in ('both', 'supersid_format'):
            self.logger.log_supersid_format(self.stations, self.date_begin_epoch, filename, log_type)

    def on_close(self):
        if(self.sampler!= 0):
            self.sampler.close()


#-------------------------------------------------------------------------------
#-------------------------------------------------------------------------------
#-------------------------------------------------------------------------------
#-------------------------------------------------------------------------------


if __name__ == '__main__':
    app = wx.App()
    SuperSID()
    app.MainLoop()


#-------------------------------------------------------------------------------
#-------------------------------------------------------------------------------
