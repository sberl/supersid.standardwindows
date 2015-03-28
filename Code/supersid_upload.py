'''
    supersid_upload
    version: 1.2.0rc4
    Copyright: Stanford Solar Center - 2008 - 2012
'''

#-------------------------------------------------------------------------------
import sys
import os
import random
import time
from time import strftime
import glob
import ConfigParser
from ftplib import FTP

#-------------------------------------------------------------------------------
# constants:
_LOCAL_DATA_PATH   = "../Data/"
CONFIG_PATH_NAME   = "../Config/"

#-------------------------------------------------------------------------------
# To better handling the network connection, condition variabilities,...
# Let's keep "Upload" task separated from supersid's main operation, here

class UploadConfig():

    '''
    UploadConfig uses only these parameters from "supersid.cfg"

    [PARAMETERS]
    automatic_upload = yes
    ftp_server = sid-ftp.stanford.edu
    ftp_directory = /incoming/NEW/
    '''


    def __init__(self, filename="supersid.cfg"):
        config_parser = ConfigParser.ConfigParser()
        # config_parser.read(filename)

        config_parser.read([CONFIG_PATH_NAME + filename,
                                          os.path.expanduser(os.path.join('~', filename))])

        section = 'PARAMETERS'
        try:
            parameter = 'data_path'
            self.data_path = config_parser.get(section, parameter) + '/'
        except:
            self.data_path = _LOCAL_DATA_PATH
            pass

        try:
            parameter = 'automatic_upload'
            self.automatic_upload = config_parser.get(section, parameter)

            parameter = 'ftp_server'
            self.ftp_server = config_parser.get(section, parameter)

            parameter = 'ftp_directory'
            self.ftp_directory = config_parser.get(section, parameter)

            self.config_ok = True
        except:

            print "'",parameter ,"' is not found in 'supersid.cfg'. Please check."
            self.config_ok = False


#-------------------------------------------------------------------------------

def upload(filelist):
    config = UploadConfig()
    if config.config_ok == False:
        print "supersid_upload: Fail to read supersid.cfg"
        return

    if config.automatic_upload.upper() != 'YES':
        return

    # If no filelist specified, get all "*.csv" in the last 24 hours
    # ie: "../Data/*_2009-03-21_*.csv"
    if filelist == "":
        # file_specs = config.data_path + "*" + strftime("%Y", time.gmtime((time.time()-(24*60*60)))) + "_*.csv"
        print config.data_path
        file_specs = config.data_path + "*" + strftime("_%Y-%m-%d", time.gmtime((time.time()-(24*60*60)))) + "_*.csv"
        items = glob.glob(file_specs)

        # inserting a "," is a bit silly, but we want to be compatible
        # with the old code
        for f in items:
            filelist = filelist + (os.path.split(f))[1] + ","

        filelist = filelist.strip(",")
        # print "Files to upload 1 : ", filelist

    try:

        ftp = FTP(config.ftp_server, 'anonymous', '')
        ftp.cwd(config.ftp_directory)

        filenames = filelist.split(",")

        for filename in filenames:
            file_handle = open(config.data_path + filename,'rb')  # file to send
            ftp.storbinary('STOR '+filename, file_handle)         # Send the file

        file_handle.close()                                       # Close file and FTP
        ftp.quit()

        print "Uploaded: ", filelist

    except:

        print "Fail to upload these files: ", filelist
        print "ftp_server: ", config.ftp_server
        print "ftp_directory: ", config.ftp_directory

#-------------------------------------------------------------------------------
'''
For running supersid_upload.py directly from command line
'''

def do_main(filelist = '', delay_max = 0):

    # Randomly wait for (0-900 seconds)
    if delay_max != "0":
        seconds = int (random.random() * int(delay_max))
        #seconds = int(delay_max)
        time.sleep(seconds)
        print "After delay for", seconds, "seconds."


    if filelist:
        print "Files to upload : ", filelist

    upload(filelist)


#-------------------------------------------------------------------------------

if __name__ == '__main__':

    # Route all stdout to log
    # sys.stdout = open("supersid_upload.log","w")

    filelist  = ''
    delay_max = '900'


    if len(sys.argv) == 2:
        filelist = sys.argv[1]
    if len(sys.argv) == 3:
        filelist = sys.argv[1]
        delay_max = sys.argv[2]

    #print "filelist  = ", filelist
    #print "delay_max = ", delay_max

    do_main(filelist, delay_max)



#-------------------------------------------------------------------------------
