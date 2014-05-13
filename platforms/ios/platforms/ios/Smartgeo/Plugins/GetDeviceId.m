//
//  GetDeviceId.m
//  Smartgeo
//
//  Created by Gulian on 07/05/2014.
//
//

#import "GetDeviceId.h"

@implementation GetDeviceId : CDVPlugin


-(void) getDeviceId:(CDVInvokedUrlCommand*)command
{
    NSString *uuidString = [[[UIDevice currentDevice] identifierForVendor] UUIDString];
    NSString *uuidName   = [[UIDevice currentDevice] systemName];
    NSMutableArray    *resultsArray      = [[NSMutableArray alloc]init];
    
    [resultsArray addObject:uuidName];
    [resultsArray addObject:uuidString];
    
    CDVPluginResult* pluginResult = nil;

    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:resultsArray ];
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
