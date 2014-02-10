#import "GotoPlugin.h"

@implementation GotoPlugin


-(void) goto:(CDVInvokedUrlCommand*)command
{
    NSString* fromLat = [command.arguments objectAtIndex:0];
    NSString* fromLng = [command.arguments objectAtIndex:1];
    NSString* toLat = [command.arguments objectAtIndex:2];
    NSString* toLng = [command.arguments objectAtIndex:3];

    NSMutableArray *_url = [NSMutableArray arrayWithObjects:@"http://maps.apple.com/?saddr=",fromLat,@",",fromLng,@"&daddr=", toLat,@",", toLng, nil];

    NSURL *url = [[NSURL alloc] initWithString:[_url componentsJoinedByString:@""]];
    [[UIApplication sharedApplication] openURL:url];
}

@end
