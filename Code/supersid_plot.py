'''
    supersid_plot
    version: 1.2.0rc4
    Copyright: Stanford Solar Center - 2008

'''

#-------------------------------------------------------------------------------
import sys
import getopt

import numpy as np
import matplotlib.pyplot as plt
#-------------------------------------------------------------------------------

class SUPERSID_PLOT():

    def __init__(self):
        #self.data
        #self.config
        return

    def select_file(self):
        self.filename = "";
        return

    def read_data(self, filename):
        lines=([])
        try:
            fin = open(filename, "r")
            lines = fin.readlines()
            fin.close()
        except IOError:
            print "File %s does not exist!" % filename

        # Detect file_type
        # multiple columns ie: WSO_2008-11-01.csv
        # single data column ie: WSO_NAA_2008-11-01.csv or old sid 20080224_000000_NAA_S-0000.csv

        if(lines[9].startswith("# Frequencies = ")):
           multiple_column_flag = 1    # multiple columns
        else:
           multiple_column_flag = 0
        #print "multiple column flag ", multiple_column_flag

        # Read Headers
        sid_paras = dict()
        for line in lines:
            if(line[0] == '#'):
                tokens = line.split(" = ")
                if (len(tokens) > 1):
                    key = tokens[0][2:]
                    sid_paras[key]=tokens[1].strip()
            else:
                break;

        #print "sid_paras ",sid_paras

        # Parse only the info needed to use
        site_name = sid_paras['Site']
        start_time = sid_paras['UTC_StartTime']
        station_names = []

        if (multiple_column_flag == 1):
            self.log_interval = int (sid_paras['LogInterval'])
            station_string = sid_paras['Stations']
            station_names = station_string.split(', ')
            number_of_stations = len (station_names)

        else: # single column and old sid has the same internal file format
            self.log_interval = int (sid_paras['SampleRate'])
            station_names.append(sid_paras['StationID'])
            number_of_stations = 1

        samples_per_hour = int (60 / self.log_interval) * 60
        number_of_samples = samples_per_hour * 24

        self.t    = np.arange(0.0, 24.0 , 1.0/samples_per_hour)
        #self.data = np.arange(0, number_of_samples)
        self.data = np.zeros((number_of_samples, number_of_stations))

        i=0;
        # Read Data
        for line in lines:
            if(line[0] == '#'):
                continue
            else:
                if(multiple_column_flag == 1):
                    tokens = line.split(", ")
                    if (len(tokens) > 1):
                        if(i > number_of_samples):
                            print "There are more data lines than expected"
                            break
                        for j in range(0, number_of_stations):
                            self.data[i][j] = float(tokens[j])
                        i+=1
                else: # single columns
                    tokens = line.split(", ")
                    if (len(tokens) > 1):
                        if(i > number_of_samples):
                            print "There are more data lines than expected"
                            break
                        self.data[i] = float(tokens[1])
                        i+=1
        #print "data len ", len(self.data)


    #-------------------------------------------------------------------------------

    def sim_read_data(self, filename):
        # parse header , parse data
        self.filename = filename
        self.log_interval = 5
        samples_per_hour = int (60 / self.log_interval) * 60
        number_of_samples = samples_per_hour * 24

        # sim data
        self.data = np.arange(0, number_of_samples)
        self.t    = np.arange(0.0, 24.0 , 1.0/samples_per_hour)

        value = 10
        for i in range(number_of_samples):
            if ((i % samples_per_hour) == 0):
                value += 10
            self.data[i]=value
        return

    #-------------------------------------------------------------------------------

    def plot_data(self):
        plt.plot(self.t, self.data)
        # set other decorating plot properties
        current_axes = plt.gca()
        current_axes.set_xlim([0,24])
        current_axes.set_xlabel("UTC Time")
        current_axes.set_ylabel("Signal Strength")
        #current_axes.grid(True)

        # figure
        current_figure = plt.gcf()
        current_figure.canvas.manager.set_window_title('supersid_plot')
        #current_figure.set_figsize_inches(8.0,6.0)

        # Sunrise and sunset shade
        sun_rise = 6.0
        sun_set  = 18.0
        plt.axvspan(0.0, sun_rise, facecolor='blue', alpha=0.2)
        plt.axvspan(sun_set, 24.0, facecolor='blue', alpha=0.2)

        plt.show()

    #-------------------------------------------------------------------------------

    def plot_filelist(self, filelist):

        # set other decorating plot properties
        current_axes = plt.gca()
        current_axes.set_xlim([0,24])
        current_axes.set_xlabel("UTC Time")
        current_axes.set_ylabel("Signal Strength")
        #current_axes.grid(True)

        # figure
        current_figure = plt.gcf()
        current_figure.canvas.manager.set_window_title('supersid_plot')
        #current_figure.set_figsize_inches(8.0,6.0)

        # Sunrise and sunset shade
        sun_rise = 6.0
        sun_set  = 18.0
        plt.axvspan(0.0, sun_rise, facecolor='blue', alpha=0.2)
        plt.axvspan(sun_set, 24.0, facecolor='blue', alpha=0.2)

        filenames = filelist.split(",")

        first_time = 1;

        for filename in filenames:
            data = np.loadtxt(filename, comments='#', delimiter=",", skiprows=12, usecols=[1])
            if(first_time == 1):
                first_time = 0
                data_length = len(data) # supersid always stores data for the whole buffer or data for the whole day
                time_data   = np.arange(0.0, 24.0 , 24.0/(1.0 * data_length))
            else:
                if(data_length != len(data)):
                   print 'Warning: comparing data of different lengths!'

            plt.plot(time_data, data)

        plt.show()

#-------------------------------------------------------------------------------
'''
For running supersid_plot.py directly from command line
'''

def do_main(filelist):

    ssp = SUPERSID_PLOT()
    ssp.plot_filelist(filelist);

#-------------------------------------------------------------------------------


if __name__ == '__main__':

    if (len(sys.argv) == 2):
        do_main(sys.argv[1])

    else:
        print "\n\nUsage:   supersid_plot.py  filename.csv\n"
        print "\n\nUsage:   supersid_plot.py  \"filename1.csv,filename2.csv,filename3.csv\"\n"


#-------------------------------------------------------------------------------
#-------------------------------------------------------------------------------
