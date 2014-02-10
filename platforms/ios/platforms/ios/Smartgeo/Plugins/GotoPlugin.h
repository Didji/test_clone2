#import <Foundation/Foundation.h>

#import <CORDOVA/CDVPlugin.h>

#import "AppDelegate.h"

@interface GotoPlugin : CDVPlugin {
    
}

-(void) goto:(CDVInvokedUrlCommand*)command;


@end
