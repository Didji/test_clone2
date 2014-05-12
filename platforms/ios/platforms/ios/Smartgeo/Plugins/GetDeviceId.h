#import <Foundation/Foundation.h>

#import <CORDOVA/CDVPlugin.h>

#import "AppDelegate.h"

@interface GetDeviceId : CDVPlugin {
    
}

-(void) getDeviceId:(CDVInvokedUrlCommand*)command;


@end
